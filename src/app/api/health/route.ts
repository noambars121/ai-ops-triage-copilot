import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', database: error.message }, { status: 500 });
  }
}
