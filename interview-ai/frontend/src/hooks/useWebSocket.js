import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'

export function useWebSocket(sessionId) {
  const [lastMessage, setLastMessage] = useState(null)
  const clientRef = useRef(null)

  useEffect(() => {
    if (!sessionId) return

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      onConnect: () => {
        client.subscribe(`/topic/interview/${sessionId}`, (msg) => {
          try {
            setLastMessage(JSON.parse(msg.body))
          } catch (e) {
            console.warn('WS message parse error:', e)
          }
        })
      },
      onStompError: (frame) => console.warn('STOMP error:', frame),
      reconnectDelay: 5000,
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [sessionId])

  return { lastMessage }
}
