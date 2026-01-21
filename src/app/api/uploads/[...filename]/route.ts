import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import mime from 'mime';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string[] } }
) {
  // 1. Check Auth
  const session = await getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Resolve File Path
  // params.filename is an array, e.g. ['kb', 'file.pdf'] or ['file.png']
  const filePathParts = params.filename;
  const safePath = join(process.cwd(), 'private', 'uploads', ...filePathParts);

  // Security check: Ensure path is within private/uploads
  const uploadsDir = join(process.cwd(), 'private', 'uploads');
  if (!safePath.startsWith(uploadsDir)) {
      return new NextResponse('Forbidden', { status: 403 });
  }

  if (!existsSync(safePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  // 3. Serve File
  try {
    const fileBuffer = await readFile(safePath);
    const mimeType = mime.getType(safePath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
