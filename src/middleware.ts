import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define protected routes
  const protectedRoutes = ['/inbox', '/tickets', '/kb', '/logs', '/outbox', '/metrics', '/api/uploads'];
  
  // Check if the path starts with any of the protected routes
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  if (isProtectedRoute) {
    const cookie = request.cookies.get('session')?.value;
    const session = cookie ? await decrypt(cookie) : null;

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
