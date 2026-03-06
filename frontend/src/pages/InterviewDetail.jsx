import { useParams } from 'react-router-dom'

export default function InterviewDetail() {
  const { id } = useParams()
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Bu sayfa Mülakat Detayı</h1>
      <p>Mülakat id: {id}. Sorular, transcript, feedback burada olacak.</p>
    </div>
  )
}
