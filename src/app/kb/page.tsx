import { prisma } from '@/lib/db';
import { addKBDocument } from '../actions';
import { Plus, Upload } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function checkAuth() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }
}

export default async function KBPage() {
  await checkAuth();
  const articles = await prisma.kBDocument.findMany({
    orderBy: { created_at: 'desc' },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Knowledge Base</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
            {articles.map(article => {
                // Check if body contains file link
                const fileMatch = article.body.match(/📎 File: (\/uploads\/kb\/[^\s]+)/);
                const fileUrl = fileMatch ? fileMatch[1] : null;
                const bodyWithoutFile = fileUrl ? article.body.replace(/📎 File:.*$/, '').trim() : article.body;
                
                return (
                    <div key={article.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{article.title}</h3>
                        <div className="text-xs text-gray-600 mb-3">
                            {article.tags?.split(',').map(tag => (
                                <span key={tag} className="bg-gray-100 text-gray-800 px-2 py-1 rounded mr-2 font-medium">{tag.trim()}</span>
                            ))}
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">{bodyWithoutFile}</p>
                        {fileUrl && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <a href={fileUrl} target="_blank" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold hover:underline">
                                    <Upload className="h-4 w-4" />
                                    Download File
                                </a>
                            </div>
                        )}
                    </div>
                );
            })}
            {articles.length === 0 && <p className="text-gray-700 font-medium">No articles found.</p>}
        </div>

        <div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-4">
                <h2 className="font-bold mb-4 flex items-center gap-2 text-gray-900">
                    <Plus className="h-4 w-4" /> Add Document
                </h2>
                <form action={addKBDocument} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">Title</label>
                        <input 
                            name="title" 
                            required 
                            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                            placeholder="How to reset password" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">Body</label>
                        <textarea 
                            name="body" 
                            required 
                            rows={5} 
                            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" 
                            placeholder="Steps..." 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">Tags (comma separated)</label>
                        <input 
                            name="tags" 
                            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                            placeholder="account, security" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1">Upload File (Optional)</label>
                        <input 
                            name="file" 
                            type="file" 
                            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
                        />
                        <p className="text-xs text-gray-600 mt-1">Upload a document file (PDF, DOCX, TXT, etc.)</p>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-semibold transition-colors">
                        Add Document
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}
