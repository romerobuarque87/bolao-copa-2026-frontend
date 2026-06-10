import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import '../App.css'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  async function fazerLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, senha })
      localStorage.setItem('token', response.data.token)
      navigate('/dashboard')
    } catch {
      setErro('E-mail ou senha inválidos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-deco">⚽</div>

      <div className="login-box">
        <div className="login-logo">
          <h1>BOLÃO</h1>
          <h1 style={{ color: 'var(--amarelo)', WebkitTextStroke: '1.5px var(--verde-escuro)' }}>
            COPA 2026
          </h1>
          <p>🇧🇷 &nbsp; EUA · CAN · MEX &nbsp; 🏆</p>
        </div>

        {erro && (
          <div className="alerta alerta-erro">
            <span>⚠️</span> {erro}
          </div>
        )}

        <form className="login-form" onSubmit={fazerLogin}>
          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Entrando…' : '⚡ Entrar'}
          </button>
        </form>

        <p className="login-footer">Bolão Copa do Mundo 2026</p>
      </div>
    </div>
  )
}

export default Login
