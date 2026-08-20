import { useState } from 'react'
import { chat } from '../lib/api'

interface Props {
  appContext: string
  mapBbox: number[] | null
  onGeojson?: (geojson: object) => void
}

interface Message {
  role: 'user' | 'ai'
  text: string
}

export default function AiChat({ appContext, mapBbox, onGeojson }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(true)

  async function send() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await chat(text, appContext, mapBbox)
      setMessages(prev => [...prev, { role: 'ai', text: res.reply || 'エラーが発生しました' }])
      if (res.geojson && onGeojson) onGeojson(res.geojson)
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'API接続エラー。地図機能は引き続き利用できます。' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setOpen(o => !o)}>
        <span>🤖 AI アシスタント</span>
        <span>{open ? '▼' : '▲'}</span>
      </div>
      {open && (
        <>
          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.hint}>地図について自然言語で質問できます</div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? styles.userMsg : styles.aiMsg}>
                {m.text}
              </div>
            ))}
            {loading && <div style={styles.aiMsg}>考え中...</div>}
          </div>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="例: 梅田周辺の要点検設備を表示して"
            />
            <button style={styles.btn} onClick={send} disabled={loading}>送信</button>
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute', bottom: 20, right: 20, width: 320,
    background: 'rgba(15,23,42,0.95)', border: '1px solid #334155',
    borderRadius: 12, overflow: 'hidden', zIndex: 100,
    backdropFilter: 'blur(8px)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', background: '#1e293b', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
  },
  messages: {
    height: 200, overflowY: 'auto', padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  hint: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 8 },
  userMsg: {
    alignSelf: 'flex-end', background: '#2563eb', borderRadius: 8,
    padding: '6px 10px', fontSize: 13, maxWidth: '80%',
  },
  aiMsg: {
    alignSelf: 'flex-start', background: '#1e293b', borderRadius: 8,
    padding: '6px 10px', fontSize: 13, maxWidth: '80%', color: '#94a3b8',
  },
  inputRow: { display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid #1e293b' },
  input: {
    flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
    color: '#f1f5f9', padding: '6px 10px', fontSize: 13, outline: 'none',
  },
  btn: {
    background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff',
    padding: '6px 12px', fontSize: 13, cursor: 'pointer',
  },
}
