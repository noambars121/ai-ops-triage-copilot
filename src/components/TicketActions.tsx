'use client';

import { useState } from 'react';
import { approveTicket, saveDraft, escalateTicket, retryPipeline } from '@/app/actions';

export default function TicketActions({ ticket }: { ticket: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(ticket.ai_suggested_reply || '');
  const [isSending, setIsSending] = useState(false);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to send this reply?')) return;
    setIsSending(true);
    try {
      if (isEditing) {
          await saveDraft(ticket.id, draft);
      }
      await approveTicket(ticket.id);
      setIsEditing(false);
    } catch (e) {
      alert('Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const handleEscalate = async () => {
      if (!confirm('Escalate this ticket?')) return;
      await escalateTicket(ticket.id);
  };
  
  const handleRetry = async () => {
      setIsSending(true);
      try {
        await retryPipeline(ticket.id);
      } finally {
        setIsSending(false);
      }
  };

  if (ticket.status === 'failed') {
      return (
          <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800 flex justify-between items-center">
              <span>⚠️ Pipeline failed.</span>
              <button onClick={handleRetry} disabled={isSending} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50">
                  {isSending ? 'Retrying...' : 'Retry Pipeline'}
              </button>
          </div>
      );
  }

  if (ticket.status === 'replied') {
    return (
      <div className="bg-green-50 border border-green-200 p-4 rounded-md text-green-800">
        ✅ This ticket has been replied to.
      </div>
    );
  }
  
  if (ticket.status === 'escalated') {
      return (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800">
          🔺 This ticket is escalated.
        </div>
      );
  }

  return (
    <div className="space-y-4">
      {isEditing ? (
        <div className="space-y-2">
            <label className="text-sm font-medium">Edit Reply</label>
            <textarea
            className="w-full p-3 border rounded-md h-48"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
                <button
                    onClick={() => { setIsEditing(false); setDraft(ticket.ai_suggested_reply || ''); }}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                    Cancel
                </button>
            </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md border">
            <h3 className="font-semibold mb-2 text-sm text-gray-500 uppercase">Suggested Reply</h3>
            <p className="whitespace-pre-wrap text-gray-800">{ticket.ai_suggested_reply || 'No suggestion available.'}</p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleApprove}
          disabled={isSending || !ticket.ai_suggested_reply}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {isSending ? 'Sending...' : (isEditing ? 'Save & Send' : 'Approve & Send')}
        </button>
        
        {!isEditing && (
            <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
            Edit Draft
            </button>
        )}
        
        <button
          onClick={handleEscalate}
          className="px-4 py-2 border border-red-200 text-red-700 rounded-md hover:bg-red-50 ml-auto"
        >
          Escalate
        </button>
      </div>
    </div>
  );
}
