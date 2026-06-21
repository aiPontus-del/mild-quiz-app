import { NextResponse } from 'next/server';
import QZ from '@/lib/quizzes-fs';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const quiz = QZ.rawOne(params.id);
  if (!quiz) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
  return NextResponse.json({ quiz });
}

export async function DELETE(_request, { params }) {
  const res = QZ.remove(params.id);
  if (res.error) return NextResponse.json(res, { status: 404 });
  return NextResponse.json(res);
}
