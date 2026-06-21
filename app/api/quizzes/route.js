import { NextResponse } from 'next/server';
import QZ from '@/lib/quizzes-fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ quizzes: QZ.rawList() });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch (e) { return NextResponse.json({ error: 'Ogiltig JSON' }, { status: 400 }); }
  const res = QZ.save(body);
  if (res.error) return NextResponse.json(res, { status: 400 });
  return NextResponse.json(res);
}
