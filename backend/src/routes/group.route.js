import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getGroups,
  getGroupMessages,
  sendGroupMessage,
  addGroupMembers,
  removeGroupMember,
  updateGroup,
  leaveGroup,
  deleteGroup
} from "../controllers/group.controller.js";

const router = express.Router();

// All routes are protected
router.use(protectRoute);

// Group management routes
router.post("/", createGroup);                          // Create new group
router.get("/", getGroups);                            // Get user's groups
router.put("/:id", updateGroup);                       // Update group details
router.delete("/:id", deleteGroup);                    // Delete group (admin only)
router.delete("/:id/leave", leaveGroup);               // Leave group

// Group member management
router.post("/:id/members", addGroupMembers);          // Add members to group
router.delete("/:id/members/:memberId", removeGroupMember); // Remove member from group

// Group messaging routes
router.get("/:id/messages", getGroupMessages);         // Get group messages
router.post("/:id/messages", sendGroupMessage);        // Send message to group

export default router;