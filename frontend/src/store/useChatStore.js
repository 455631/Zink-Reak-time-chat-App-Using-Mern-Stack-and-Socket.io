import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  // Existing state
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  // New group-related state
  groups: [],
  selectedGroup: null,
  isGroupsLoading: false,
  isCreatingGroup: false,
  groupMessages: {},

  // Existing user methods
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to load users";
      toast.error(errorMessage);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to load messages";
      toast.error(errorMessage);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages, groupMessages } = get();
    
    // Check if sending to user or group
    if (!selectedUser && !selectedGroup) {
      toast.error("No user or group selected");
      return;
    }
    
    try {
      // For large payloads, consider implementing compression or chunking
      // Check if we have image data that might be too large
      if (messageData.image && messageData.image.length > 500000) {
        // Basic image compression using canvas (simplified for demonstration)
        const compressedImage = await compressImage(messageData.image, 0.7);
        messageData.image = compressedImage;
      }
      
      let res;
      
      if (selectedUser) {
        // Send to individual user
        res = await axiosInstance.post(
          `/messages/send/${selectedUser._id}`, 
          messageData,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (res.data) {
          set({ messages: [...messages, res.data] });
        }
      } else if (selectedGroup) {
        // Send to group
        res = await axiosInstance.post(
          `/groups/${selectedGroup._id}/messages`, 
          messageData,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (res.data) {
          const currentGroupMessages = groupMessages[selectedGroup._id] || [];
          set({ 
            groupMessages: {
              ...groupMessages,
              [selectedGroup._id]: [...currentGroupMessages, res.data]
            }
          });
        }
      }
    } catch (error) {
      console.error("Send message error:", error);
      const errorMessage = error.response?.data?.message || "Failed to send message";
      toast.error(errorMessage);
      throw error; // Rethrow so the component can handle it
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, selectedGroup } = get();
    const socket = useAuthStore.getState().socket;
    
    if (!socket) {
      console.error("Socket not available");
      return;
    }

    // Subscribe to individual messages
    if (selectedUser) {
      socket.on("newMessage", (newMessage) => {
        if (!newMessage) return;
        
        const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
        if (!isMessageSentFromSelectedUser) return;

        set({
          messages: [...get().messages, newMessage],
        });
      });
    }

    // Subscribe to group messages
    if (selectedGroup) {
      socket.on("newGroupMessage", (newMessage) => {
        if (!newMessage) return;
        
        const isMessageForSelectedGroup = newMessage.groupId === selectedGroup._id;
        if (!isMessageForSelectedGroup) return;

        const { groupMessages } = get();
        const currentGroupMessages = groupMessages[selectedGroup._id] || [];
        
        set({
          groupMessages: {
            ...groupMessages,
            [selectedGroup._id]: [...currentGroupMessages, newMessage]
          }
        });
      });
    }
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("newGroupMessage");
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ 
      selectedUser, 
      selectedGroup: null // Clear group selection when selecting user
    });
  },

  // New group methods
  setSelectedGroup: (selectedGroup) => {
    set({ 
      selectedGroup, 
      selectedUser: null // Clear user selection when selecting group
    });
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to load groups";
      toast.error(errorMessage);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups", groupData);
      
      if (res.data) {
        set((state) => ({
          groups: [...state.groups, res.data],
          isCreatingGroup: false,
        }));
        
        toast.success("Group created successfully!");
        return res.data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to create group";
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      const { groupMessages } = get();
      
      set({ 
        groupMessages: {
          ...groupMessages,
          [groupId]: res.data
        }
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to load group messages";
      toast.error(errorMessage);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  updateGroup: async (groupId, updateData) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, updateData);
      
      if (res.data) {
        set((state) => ({
          groups: state.groups.map(group => 
            group._id === groupId ? res.data : group
          ),
        }));
        
        // Update selectedGroup if it's currently selected
        const { selectedGroup } = get();
        if (selectedGroup && selectedGroup._id === groupId) {
          set({ selectedGroup: res.data });
        }
        
        toast.success("Group updated successfully!");
        return res.data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update group";
      toast.error(errorMessage);
      throw error;
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/leave`);
      
      set((state) => ({
        groups: state.groups.filter(group => group._id !== groupId),
      }));
      
      // Clear selection if leaving currently selected group
      const { selectedGroup } = get();
      if (selectedGroup && selectedGroup._id === groupId) {
        set({ selectedGroup: null });
      }
      
      toast.success("Left group successfully!");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to leave group";
      toast.error(errorMessage);
      throw error;
    }
  },

  addGroupMembers: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, {
        members: memberIds
      });
      
      if (res.data) {
        set((state) => ({
          groups: state.groups.map(group => 
            group._id === groupId ? res.data : group
          ),
        }));
        
        // Update selectedGroup if it's currently selected
        const { selectedGroup } = get();
        if (selectedGroup && selectedGroup._id === groupId) {
          set({ selectedGroup: res.data });
        }
        
        toast.success("Members added successfully!");
        return res.data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to add members";
      toast.error(errorMessage);
      throw error;
    }
  },

  removeGroupMember: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);
      
      if (res.data) {
        set((state) => ({
          groups: state.groups.map(group => 
            group._id === groupId ? res.data : group
          ),
        }));
        
        // Update selectedGroup if it's currently selected
        const { selectedGroup } = get();
        if (selectedGroup && selectedGroup._id === groupId) {
          set({ selectedGroup: res.data });
        }
        
        toast.success("Member removed successfully!");
        return res.data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to remove member";
      toast.error(errorMessage);
      throw error;
    }
  },

  // Helper method to get current messages (either user or group)
  getCurrentMessages: () => {
    const { selectedUser, selectedGroup, messages, groupMessages } = get();
    
    if (selectedUser) {
      return messages;
    } else if (selectedGroup) {
      return groupMessages[selectedGroup._id] || [];
    }
    
    return [];
  },

  // Helper method to clear all selections
  clearSelections: () => {
    set({ 
      selectedUser: null, 
      selectedGroup: null,
      messages: []
    });
  },
}));

// Helper function for image compression (unchanged)
const compressImage = (base64String, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64String;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Maintain aspect ratio but limit dimensions
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get compressed data URL
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    
    img.onerror = (error) => {
      reject(error);
    };
  });
};