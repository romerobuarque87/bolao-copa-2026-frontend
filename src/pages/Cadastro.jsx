import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/api'
import '../App.css'

function Cadastro() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  async function cadastrar(e) {
    e.preventDefault()
    setErro('')

    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      await api.post('/usuarios', {
        nome,
        email,
        senha,
        telefone,
        receberNotificacaoEmail: true,
        receberNotificacaoWhatsapp: false,
        administrador: false
      })

      alert('Cadastro realizado com sucesso! Agora faça login.')
      navigate('/login')
    } catch (error) {
      setErro(
        error.response?.data?.message ||
        error.response?.data?.erro ||
        error.response?.data ||
        'Erro ao realizar cadastro.'
      )
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

        <form className="login-form" onSubmit={cadastrar}>
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex: 81999999999"
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirmar senha</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Cadastrando…' : 'Criar conta'}
          </button>
        </form>

        <p className="login-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}

export default Cadastro