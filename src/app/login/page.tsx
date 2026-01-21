'use client';

import { login } from '../actions';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} type="submit" className="w-full bg-blue-600 text-white p-2.5 rounded-md disabled:opacity-50 font-semibold hover:bg-blue-700 transition-colors shadow-sm">
      {pending ? 'Logging in...' : 'Login'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">Ops Inbox Login</h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
            <input 
              type="password" 
              name="password" 
              placeholder="Enter admin password" 
              required 
              className="w-full p-2.5 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          {state?.error && (
            <div className="text-red-800 text-sm bg-red-50 border border-red-200 p-3 rounded-md font-medium">
              {state.error}
            </div>
          )}
          <SubmitButton />
        </form>
        <p className="text-xs text-gray-700 mt-4 text-center font-medium">
          Default password: <span className="font-semibold text-gray-900">admin</span> (set ADMIN_PASSWORD in .env to change)
        </p>
      </div>
    </div>
  );
}
