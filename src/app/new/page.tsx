import { createTicket } from '../actions';

export default function NewTicketPage() {
  return (
    <div className="max-w-xl mx-auto bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <h1 className="text-xl font-bold mb-4 text-gray-900">Submit New Ticket</h1>
      
      <form action={createTicket} className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Name</label>
            <input 
              name="customer_name" 
              required 
              className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Email</label>
            <input 
              name="customer_email" 
              type="email" 
              required 
              className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Product Area</label>
                <select name="product_area" className="w-full p-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required>
                    <option value="billing">Billing & Subscription</option>
                    <option value="technical">Technical Issue</option>
                    <option value="account">Account Management</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Subject</label>
                <input 
                    name="subject" 
                    required 
                    className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                    placeholder="Brief summary"
                />
            </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Message</label>
          <textarea 
            name="message" 
            required 
            rows={3} 
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" 
            placeholder="Describe the issue in detail..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Attachment <span className="text-gray-400 font-normal">(Optional, PDF/PNG/JPG, max 10MB)</span>
          </label>
          <input 
            name="attachment" 
            type="file" 
            accept="image/png, image/jpeg, application/pdf"
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
          />
        </div>

        {/* Honeypot field - hidden from real users */}
        <div className="hidden" aria-hidden="true">
            <label>Don't fill this out if you're human: <input name="website_url" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-semibold shadow-sm"
          >
            Submit Ticket
          </button>
        </div>
      </form>
    </div>
  );
}
