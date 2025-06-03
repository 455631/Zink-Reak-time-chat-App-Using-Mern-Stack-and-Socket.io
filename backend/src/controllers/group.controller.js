// import Group from "../models/group.model.js";
// import GroupMessage from "../models/groupmessage.model.js";
// import User from "../models/user.model.js";

// export const createGroup = async (req, res) => {
//   try {
//     const { name, description, members } = req.body;
//     const userId = req.user._id;

//     console.log("Create group request:", { name, description, members }); // Debug log

//     // Validation
//     if (!name || !name.trim()) {
//       return res.status(400).json({ message: "Group name is required" });
//     }

//     if (!members || !Array.isArray(members) || members.length < 1) {
//       return res.status(400).json({ message: "At least 1 member is required" });
//     }

//     // Verify all members exist
//     const validMembers = await User.find({ _id: { $in: members } });
//     if (validMembers.length !== members.length) {
//       return res.status(400).json({ message: "One or more members not found" });
//     }

//     // Create group with creator as admin and member
//     const allMembers = [userId, ...members.filter(id => id.toString() !== userId.toString())];
    
//     const newGroup = new Group({
//       name: name.trim(),
//       description: description?.trim() || "",
//       members: allMembers,
//       admins: [userId],
//       createdBy: userId,
//     });

//     await newGroup.save();

//     // Populate members for response
//     const populatedGroup = await Group.findById(newGroup._id)
//       .populate("members", "fullName profilePic")
//       .populate("admins", "fullName profilePic")
//       .populate("createdBy", "fullName profilePic");

//     console.log("Group created successfully:", populatedGroup._id); // Debug log

//     res.status(201).json(populatedGroup);
//   } catch (error) {
//     console.error("Error in createGroup:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const getGroups = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const groups = await Group.find({
//       members: userId,
//       isActive: true
//     })
//       .populate("members", "fullName profilePic")
//       .populate("admins", "fullName profilePic")
//       .populate("createdBy", "fullName profilePic")
//       .sort({ updatedAt: -1 });

//     res.status(200).json(groups);
//   } catch (error) {
//     console.error("Error in getGroups:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const getGroupMessages = async (req, res) => {
//   try {
//     const { id: groupId } = req.params;
//     const userId = req.user._id;

//     // Check if user is a member of the group
//     const group = await Group.findById(groupId);
//     if (!group || !group.members.includes(userId)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     const messages = await GroupMessage.find({ groupId })
//       .populate("senderId", "fullName profilePic")
//       .sort({ createdAt: 1 });

//     res.status(200).json(messages);
//   } catch (error) {
//     console.error("Error in getGroupMessages:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const sendGroupMessage = async (req, res) => {
//   try {
//     const { text, image } = req.body;
//     const { id: groupId } = req.params;
//     const senderId = req.user._id;

//     // Check if user is a member of the group
//     const group = await Group.findById(groupId);
//     if (!group || !group.members.includes(senderId)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     // Validate message content
//     if (!text && !image) {
//       return res.status(400).json({ message: "Message cannot be empty" });
//     }

//     const newMessage = new GroupMessage({
//       senderId,
//       groupId,
//       text: text || "",
//       image: image || "",
//     });

//     await newMessage.save();

//     // Populate sender info for response
//     const populatedMessage = await GroupMessage.findById(newMessage._id)
//       .populate("senderId", "fullName profilePic");

//     // Update group's last activity
//     await Group.findByIdAndUpdate(groupId, { updatedAt: new Date() });

//     // Emit to all group members via socket
//     const io = req.app.get('io');
//     if (io) {
//       io.to(groupId.toString()).emit("newGroupMessage", populatedMessage);
//     }

//     res.status(201).json(populatedMessage);
//   } catch (error) {
//     console.error("Error in sendGroupMessage:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const updateGroup = async (req, res) => {
//   try {
//     const { id: groupId } = req.params;
//     const { name, description } = req.body;
//     const userId = req.user._id;

//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Check if user is admin
//     if (!group.admins.includes(userId)) {
//       return res.status(403).json({ message: "Only admins can update group details" });
//     }

//     const updatedGroup = await Group.findByIdAndUpdate(
//       groupId,
//       {
//         ...(name && { name: name.trim() }),
//         ...(description !== undefined && { description: description.trim() }),
//       },
//       { new: true }
//     )
//       .populate("members", "fullName profilePic")
//       .populate("admins", "fullName profilePic")
//       .populate("createdBy", "fullName profilePic");

//     res.status(200).json(updatedGroup);
//   } catch (error) {
//     console.error("Error in updateGroup:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const addGroupMembers = async (req, res) => {
//   try {
//     const { id: groupId } = req.params;
//     const { members } = req.body;
//     const userId = req.user._id;

//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Check if user is admin
//     if (!group.admins.includes(userId)) {
//       return res.status(403).json({ message: "Only admins can add members" });
//     }

//     // Verify all new members exist and are not already in group
//     const newMembers = members.filter(memberId => 
//       !group.members.some(existing => existing.toString() === memberId.toString())
//     );

//     if (newMembers.length === 0) {
//       return res.status(400).json({ message: "All users are already members" });
//     }

//     const validUsers = await User.find({ _id: { $in: newMembers } });
//     if (validUsers.length !== newMembers.length) {
//       return res.status(400).json({ message: "One or more users not found" });
//     }

//     const updatedGroup = await Group.findByIdAndUpdate(
//       groupId,
//       { $addToSet: { members: { $each: newMembers } } },
//       { new: true }
//     )
//       .populate("members", "fullName profilePic")
//       .populate("admins", "fullName profilePic")
//       .populate("createdBy", "fullName profilePic");

//     res.status(200).json(updatedGroup);
//   } catch (error) {
//     console.error("Error in addGroupMembers:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const removeGroupMember = async (req, res) => {
//   try {
//     const { id: groupId, memberId } = req.params;
//     const userId = req.user._id;

//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Check if user is admin or removing themselves
//     if (!group.admins.includes(userId) && userId.toString() !== memberId) {
//       return res.status(403).json({ message: "Permission denied" });
//     }

//     // Prevent removing the creator
//     if (group.createdBy.toString() === memberId.toString()) {
//       return res.status(400).json({ message: "Cannot remove group creator" });
//     }

//     const updatedGroup = await Group.findByIdAndUpdate(
//       groupId,
//       {
//         $pull: {
//           members: memberId,
//           admins: memberId
//         }
//       },
//       { new: true }
//     )
//       .populate("members", "fullName profilePic")
//       .populate("admins", "fullName profilePic")
//       .populate("createdBy", "fullName profilePic");

//     res.status(200).json(updatedGroup);
//   } catch (error) {
//     console.error("Error in removeGroupMember:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const leaveGroup = async (req, res) => {
//   try {
//     const { id: groupId } = req.params;
//     const userId = req.user._id;

//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Prevent creator from leaving (they should transfer ownership first)
//     if (group.createdBy.toString() === userId.toString()) {
//       return res.status(400).json({ 
//         message: "Group creator cannot leave. Transfer ownership first or delete the group." 
//       });
//     }

//     await Group.findByIdAndUpdate(groupId, {
//       $pull: {
//         members: userId,
//         admins: userId
//       }
//     });

//     res.status(200).json({ message: "Left group successfully" });
//   } catch (error) {
//     console.error("Error in leaveGroup:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const deleteGroup = async (req, res) => {
//   try {
//     const { id: groupId } = req.params;
//     const userId = req.user._id;

//     const group = await Group.findById(groupId);
//     if (!group) {
//       return res.status(404).json({ message: "Group not found" });
//     }

//     // Only creator can delete group
//     if (group.createdBy.toString() !== userId.toString()) {
//       return res.status(403).json({ message: "Only group creator can delete the group" });
//     }

//     // Delete all group messages
//     await GroupMessage.deleteMany({ groupId });
    
//     // Delete the group
//     await Group.findByIdAndDelete(groupId);

//     res.status(200).json({ message: "Group deleted successfully" });
//   } catch (error) {
//     console.error("Error in deleteGroup:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };