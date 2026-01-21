import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SECRET_KEY = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'default-secret-key-change-me';
const key = new TextEncoder().encode(SECRET_KEY);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function login(password: string) {
  // Get admin password and strip quotes if present (some .env parsers include them)
  let adminPassword = (process.env.ADMIN_PASSWORD || 'admin').trim();
  if ((adminPassword.startsWith('"') && adminPassword.endsWith('"')) || 
      (adminPassword.startsWith("'") && adminPassword.endsWith("'"))) {
    adminPassword = adminPassword.slice(1, -1);
  }
  const inputPassword = password.trim();
  if (inputPassword !== adminPassword) return false;

  // Create the session
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({ user: 'admin', expires });

  // Save the session in a cookie
  const cookieStore = await cookies();
  cookieStore.set('session', session, { 
    expires, 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax'
  });
  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  if (!parsed) return;

  parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const res = NextResponse.next();
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
