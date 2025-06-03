// components/GroupChatModel.jsx
import React from 'react';
import { X } from 'lucide-react';

const GroupChatModel = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-center">Create Group Chat</h2>
        {children}
      </div>
    </div>
  );
};

export default GroupChatModel;
