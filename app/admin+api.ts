export function GET(request: Request) {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('key');
  
  // Simple admin key check - in production, use proper authentication
  if (adminKey !== 'freedom21-admin-2025') {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return Response.json({ 
    message: 'Admin access granted',
    timestamp: new Date().toISOString()
  });
}