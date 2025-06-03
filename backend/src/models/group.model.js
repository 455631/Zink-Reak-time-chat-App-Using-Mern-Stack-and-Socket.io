import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    avatar: {
      type: String,
      default: ""
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMessage"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true 
  }
);

// Index for better query performance
groupSchema.index({ members: 1 });
groupSchema.index({ admin: 1 });
groupSchema.index({ createdAt: -1 });

// Virtual to populate member details
groupSchema.virtual('memberDetails', {
  ref: 'User',
  localField: 'members',
  foreignField: '_id'
});

// Ensure virtuals are included in JSON output
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

const Group = mongoose.model("Group", groupSchema);

export default Group;