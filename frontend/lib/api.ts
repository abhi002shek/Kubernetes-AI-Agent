import { insforge } from '@/lib/insforge'

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await insforge.getAccessToken()
  if (!token) {
    throw new Error('Not authenticated. Please sign in again.')
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}
