import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import '../App.css'

function Dashboard() {
  const [usuario, setUsuario] = useState(null)
  const [boloes, setBoloes] = useState([])
  const [jogos, setJogos] = useState([])
  const [jogosPorGrupo, setJogosPorGrupo] = useState({})
  const [ranking, setRanking] = useState([])
  const [bolaoSelecionadoId, setBolaoSelecionadoId] = useState('')
  const [palpites, setPalpites] = useState({})
  const [resultadosAdmin, setResultadosAdmin] = useState({})
  const [codigoConvite, setCodigoConvite] = useState('')
  const [nomeNovoBolao, setNomeNovoBolao] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (bolaoSelecionadoId) {
      carregarPalpitesDoBolao(bolaoSelecionadoId)
      carregarRankingDoBolaoSelecionado(bolaoSelecionadoId)
    }
  }, [bolaoSelecionadoId, boloes])

  async function carregarDados() {
    try {
      const usuarioResponse = await api.get('/auth/me')
      setUsuario(usuarioResponse.data)

      const boloesResponse = await api.get(`/boloes/usuario/${usuarioResponse.data.id}`)
      setBoloes(boloesResponse.data)

      const gruposResponse = await api.get('/jogos/grupos')
      const jogosAgrupados = gruposResponse.data || {}

      const jogosResponse = await api.get('/jogos')
      const todosJogos = jogosResponse.data || []
      const mataMata = todosJogos.filter((jogo) => jogo.fase !== 'GRUPOS')

      if (mataMata.length > 0) {
        jogosAgrupados['MATA-MATA'] = mataMata
      }

      setJogosPorGrupo(jogosAgrupados)
      setJogos(Object.values(jogosAgrupados).flat())

      if (boloesResponse.data.length > 0 && !bolaoSelecionadoId) {
        setBolaoSelecionadoId(String(boloesResponse.data[0].id))
      }
    } catch {
      setErro('Erro ao carregar dados')
    }
  }

  async function carregarPalpitesDoBolao(participanteBolaoId) {
    try {
      const response = await api.get(`/palpites/participante/${participanteBolaoId}`)
      const mapeados = {}

      response.data.forEach((p) => {
        mapeados[p.jogoId] = {
          id: p.id,
          golsCasa: p.golsCasaPalpite,
          golsVisitante: p.golsVisitantePalpite,
          classificadoPalpiteId: p.classificadoPalpiteId || '',
          pontosObtidos: p.pontosObtidos,
        }
      })

      setPalpites(mapeados)
    } catch {
      setErro('Erro ao carregar palpites do bolão')
    }
  }

  async function carregarRankingDoBolaoSelecionado(participanteBolaoId) {
    try {
      const bolaoSelecionado = boloes.find((b) => String(b.id) === String(participanteBolaoId))
      if (!bolaoSelecionado) return

      const response = await api.get(`/ranking/bolao/${bolaoSelecionado.bolaoId}`)
      setRanking(response.data)
    } catch {
      setErro('Erro ao carregar ranking')
    }
  }

  async function criarBolao(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')

    if (!nomeNovoBolao.trim()) {
      setErro('Informe o nome do bolão.')
      return
    }

    try {
      const response = await api.post('/boloes', {
        nome: nomeNovoBolao.trim(),
        organizadorId: usuario.id,
      })

      setMensagem(`Bolão criado com sucesso! Código do convite: ${response.data.codigoConvite}`)
      setNomeNovoBolao('')
      await carregarDados()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao criar bolão.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function entrarNoBolao(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')

    if (!codigoConvite.trim()) {
      setErro('Informe o código do convite')
      return
    }

    try {
      await api.post('/boloes/entrar', {
        usuarioId: usuario.id,
        codigoConvite: codigoConvite.trim(),
      })

      setMensagem('Você entrou no bolão com sucesso! 🎉')
      setCodigoConvite('')
      await carregarDados()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao entrar no bolão.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function salvarPalpite(jogo) {
    setErro('')
    setMensagem('')

    if (!bolaoSelecionadoId) {
      setErro('Selecione um bolão antes de palpitar.')
      return
    }

    const participanteBolaoId = Number(bolaoSelecionadoId)
    const palpite = palpites[jogo.id]

    if (!palpite || palpite.golsCasa === '' || palpite.golsVisitante === '' || palpite.golsCasa === undefined || palpite.golsVisitante === undefined) {
      setErro('Informe os dois placares do palpite.')
      return
    }

    if (ehMataMata(jogo) && !palpite.classificadoPalpiteId) {
      setErro('Em jogo de mata-mata, informe quem você acha que vai se classificar.')
      return
    }

    try {
      await api.post('/palpites', {
        participanteBolaoId,
        jogoId: jogo.id,
        golsCasaPalpite: Number(palpite.golsCasa),
        golsVisitantePalpite: Number(palpite.golsVisitante),
        classificadoPalpiteId: ehMataMata(jogo) ? Number(palpite.classificadoPalpiteId) : null,
      })

      setMensagem('Palpite salvo com sucesso! ✅')
      await carregarPalpitesDoBolao(participanteBolaoId)
      await carregarRankingDoBolaoSelecionado(participanteBolaoId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao salvar palpite.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function enviarPalpites() {
    setErro('')
    setMensagem('')

    if (!bolaoSelecionadoId) {
      setErro('Selecione um bolão antes de enviar os palpites.')
      return
    }

    if (!window.confirm('Tem certeza que deseja enviar seus palpites? Depois do envio, eles ficarão bloqueados.')) return

    try {
      await api.put(`/palpites/enviar/${bolaoSelecionadoId}`)
      setMensagem('Palpites enviados com sucesso! Agora eles estão bloqueados.')
      await carregarDados()
      await carregarPalpitesDoBolao(bolaoSelecionadoId)
      await carregarRankingDoBolaoSelecionado(bolaoSelecionadoId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao enviar palpites.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function atualizarPalpite(jogoId, campo, valor) {
    setPalpites((atual) => ({
      ...atual,
      [jogoId]: { ...atual[jogoId], [campo]: valor },
    }))
  }

  function atualizarResultadoAdmin(jogoId, campo, valor) {
    setResultadosAdmin((atual) => ({
      ...atual,
      [jogoId]: { ...atual[jogoId], [campo]: valor },
    }))
  }

  async function finalizarResultado(jogo) {
    setErro('')
    setMensagem('')

    const resultado = resultadosAdmin[jogo.id] || {}

    if (resultado.golsCasa === '' || resultado.golsVisitante === '' || resultado.golsCasa === undefined || resultado.golsVisitante === undefined) {
      setErro('Informe os gols dos dois times.')
      return
    }

    try {
      await api.put(`/jogos/${jogo.id}/finalizar`, null, {
        params: {
          golsCasa: Number(resultado.golsCasa),
          golsVisitante: Number(resultado.golsVisitante),
          penaltisCasa: resultado.penaltisCasa === '' || resultado.penaltisCasa === undefined ? null : Number(resultado.penaltisCasa),
          penaltisVisitante: resultado.penaltisVisitante === '' || resultado.penaltisVisitante === undefined ? null : Number(resultado.penaltisVisitante),
        }
      })

      setMensagem('Resultado finalizado com sucesso.')
      await carregarDados()
      if (bolaoSelecionadoId) {
        await carregarPalpitesDoBolao(bolaoSelecionadoId)
        await carregarRankingDoBolaoSelecionado(bolaoSelecionadoId)
      }
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao finalizar resultado.')
    }
  }

  async function corrigirResultado(jogo) {
    setErro('')
    setMensagem('')

    const resultado = resultadosAdmin[jogo.id] || {}

    if (resultado.golsCasa === '' || resultado.golsVisitante === '' || resultado.golsCasa === undefined || resultado.golsVisitante === undefined) {
      setErro('Informe os gols dos dois times.')
      return
    }

    try {
      await api.put(`/jogos/${jogo.id}/corrigir-resultado`, null, {
        params: {
          golsCasa: Number(resultado.golsCasa),
          golsVisitante: Number(resultado.golsVisitante),
          penaltisCasa: resultado.penaltisCasa === '' || resultado.penaltisCasa === undefined ? null : Number(resultado.penaltisCasa),
          penaltisVisitante: resultado.penaltisVisitante === '' || resultado.penaltisVisitante === undefined ? null : Number(resultado.penaltisVisitante),
        }
      })

      setMensagem('Resultado corrigido com sucesso.')
      await carregarDados()
      if (bolaoSelecionadoId) {
        await carregarPalpitesDoBolao(bolaoSelecionadoId)
        await carregarRankingDoBolaoSelecionado(bolaoSelecionadoId)
      }
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao corrigir resultado.')
    }
  }

  async function gerarFase(endpoint, nome) {
    setErro('')
    setMensagem('')

    try {
      const response = await api.post(`/mata-mata/${endpoint}`)
      setMensagem(response.data || `${nome} gerada com sucesso.`)
      await carregarDados()
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || `Erro ao gerar ${nome}.`)
    }
  }

  function sair() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  function formatarData(dataHora) {
    if (!dataHora) return '-'
    return new Date(dataHora).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  function formatarFase(fase) {
    if (fase === 'DEZESSEIS_AVOS') return '16 avos'
    if (fase === 'OITAVAS') return 'Oitavas'
    if (fase === 'QUARTAS') return 'Quartas'
    if (fase === 'SEMIFINAL') return 'Semifinal'
    if (fase === 'TERCEIRO_LUGAR') return '3º lugar'
    if (fase === 'FINAL') return 'Final'
    return fase
  }

  function ehMataMata(jogo) {
    return jogo.fase && jogo.fase !== 'GRUPOS'
  }

  function rankClass(pos) {
    if (pos === 1) return 'rank-pos ouro'
    if (pos === 2) return 'rank-pos prata'
    if (pos === 3) return 'rank-pos bronze'
    return 'rank-pos'
  }

  const ehAdmin = usuario?.administrador === true
  const meuBolao = boloes.find((b) => String(b.id) === String(bolaoSelecionadoId))
  const meuRanking = ranking.find((r) => r.nomeUsuario === usuario?.nome)
  const palpitesJaEnviados = meuBolao?.palpitesEnviados === true

  return (
    <div className="page-wrap">
      <div className="topbar">
        <div className="topbar-brand">
          ⚽ BOLÃO <span>Copa 2026</span>
        </div>
        <div className="topbar-user">
          {usuario && <span>👤 {usuario.nome}</span>}
          <button className="btn btn-danger btn-sm" onClick={sair}>Sair</button>
        </div>
      </div>

      <div className="container">
        {erro && <div className="alerta alerta-erro">⚠️ {erro}</div>}
        {mensagem && <div className="alerta alerta-ok">✅ {mensagem}</div>}

        <div className="hero">
          <div>
            <div className="hero-title">COPA DO MUNDO 2026</div>
            <div className="hero-sub">🇺🇸 EUA &nbsp;·&nbsp; 🇨🇦 Canadá &nbsp;·&nbsp; 🇲🇽 México</div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">{boloes.length}</div>
              <div className="hero-stat-label">{ehAdmin ? 'Bolões' : 'Meus bolões'}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">{jogos.length}</div>
              <div className="hero-stat-label">Jogos</div>
            </div>
            {meuRanking && (
              <div className="hero-stat">
                <div className="hero-stat-num">{meuRanking.pontos}</div>
                <div className="hero-stat-label">Seus pts</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid-2">
          {usuario && (
            <div className="card">
              <div className="card-title">👤 Meu Perfil</div>
              <div className="perfil-info">
                <div className="perfil-row"><strong>Nome</strong> {usuario.nome}</div>
                <div className="perfil-row"><strong>E-mail</strong> {usuario.email}</div>
                <div className="perfil-row">
                  <strong>Perfil</strong>
                  <span className={`badge ${ehAdmin ? 'badge-admin' : 'badge-user'}`}>
                    {ehAdmin ? '🛡 Administrador' : '⚽ Participante'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!ehAdmin && (
            <div className="card">
              <div className="card-title">🎟 Entrar em um Bolão</div>
              <form onSubmit={entrarNoBolao} className="convite-form">
                <input
                  type="text"
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value)}
                  placeholder="Cole o código do convite"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary">Entrar</button>
              </form>
            </div>
          )}

          {ehAdmin && (
            <div className="card">
              <div className="card-title">🛠 Criar Bolão</div>
              <form onSubmit={criarBolao} className="convite-form">
                <input
                  type="text"
                  value={nomeNovoBolao}
                  onChange={(e) => setNomeNovoBolao(e.target.value)}
                  placeholder="Nome do bolão. Ex: Bolão Família Copa 2026"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary">Criar Bolão</button>
              </form>
            </div>
          )}
        </div>

        {ehAdmin && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">🧩 Administração do Mata-Mata</div>
            <div className="selector-wrap">
              <button className="btn btn-primary btn-sm" onClick={() => gerarFase('gerar-dezesseis-avos', '16 avos')}>Gerar 16 avos</button>
              <button className="btn btn-primary btn-sm" onClick={() => gerarFase('gerar-oitavas', 'oitavas')}>Gerar oitavas</button>
              <button className="btn btn-primary btn-sm" onClick={() => gerarFase('gerar-quartas', 'quartas')}>Gerar quartas</button>
              <button className="btn btn-primary btn-sm" onClick={() => gerarFase('gerar-semifinal', 'semifinal')}>Gerar semifinal</button>
              <button className="btn btn-primary btn-sm" onClick={() => gerarFase('gerar-terceiro-lugar', 'terceiro lugar')}>Gerar 3º lugar</button>
              <button className="btn btn-primary btn-sm" onClick={() => gerarFase('gerar-final', 'final')}>Gerar final</button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">
            {ehAdmin ? '🏆 Administração de Bolões' : '🏆 Meus Bolões'}
          </div>

          {boloes.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">⚽</div>
              <p>
                {ehAdmin
                  ? 'Você ainda não criou ou participa de nenhum bolão.'
                  : 'Você ainda não participa de nenhum bolão. Use o código de convite acima!'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bolão</th>
                    <th>Código</th>
                    <th>Pontos</th>
                    <th>Palpites</th>
                  </tr>
                </thead>
                <tbody>
                  {boloes.map((bolao) => (
                    <tr key={bolao.id}>
                      <td style={{ fontWeight: 600 }}>{bolao.nomeBolao}</td>
                      <td>
                        <code style={{ background: '#f3f6f0', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>
                          {bolao.codigoConvite}
                        </code>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--verde-escuro)' }}>{bolao.pontos}</td>
                      <td>
                        <span className={`tag ${bolao.palpitesEnviados ? 'tag-ok' : 'tag-pend'}`}>
                          {bolao.palpitesEnviados ? '✓ Enviados' : '⏳ Pendentes'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">
            {ehAdmin ? '📊 Ranking e Participantes' : '📊 Ranking do Bolão'}
          </div>

          <div className="selector-wrap" style={{ marginBottom: 18 }}>
            <label>Bolão selecionado:</label>
            <select value={bolaoSelecionadoId} onChange={(e) => setBolaoSelecionadoId(e.target.value)}>
              <option value="">— Selecione —</option>
              {boloes.map((b) => (
                <option key={b.id} value={b.id}>{b.nomeBolao}</option>
              ))}
            </select>

            {!ehAdmin && bolaoSelecionadoId && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={enviarPalpites}
                disabled={palpitesJaEnviados}
                style={{ marginLeft: 12 }}
              >
                {palpitesJaEnviados ? '✓ Palpites Enviados' : 'Enviar Palpites'}
              </button>
            )}
          </div>

          {ranking.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <p>Nenhum participante no ranking ainda.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participante</th>
                    <th>Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item) => (
                    <tr key={item.participanteBolaoId}>
                      <td>
                        <span className={rankClass(item.posicao)}>
                          {item.posicao === 1 ? '🥇' : item.posicao === 2 ? '🥈' : item.posicao === 3 ? '🥉' : `${item.posicao}º`}
                        </span>
                      </td>
                      <td>{item.nomeUsuario}</td>
                      <td className="pontos-obtidos">{item.pontos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            {ehAdmin ? '⚽ Administração de Jogos e Resultados' : '⚽ Meus Palpites'}
          </div>

          {jogos.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📅</div>
              <p>Nenhum jogo cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grupos-wrap">
              {Object.entries(jogosPorGrupo).map(([grupo, jogosDoGrupo]) => (
                <div className="grupo-card" key={grupo}>
                  <div className="grupo-header">
                    <span>{grupo === 'MATA-MATA' ? 'Mata-mata' : `Grupo ${grupo}`}</span>
                    <small>{jogosDoGrupo.length} jogos</small>
                  </div>

                  <div className="grupo-jogos">
                    {jogosDoGrupo.map((jogo) => (
                      <div className="jogo-card" key={jogo.id}>
                        <div className="jogo-info">
                          <div className="jogo-data">
                            {formatarData(jogo.dataHora)}
                            {ehMataMata(jogo) && <span className="fase-mata-mata">{formatarFase(jogo.fase)}</span>}
                          </div>

                          <div className="jogo-times">
                            <div className="time time-casa">
                              <img src={jogo.timeCasaBandeiraUrl} alt={jogo.timeCasaNome} className="bandeira" />
                              <span>{jogo.timeCasaNome}</span>
                            </div>

                            <div className="versus">×</div>

                            <div className="time time-visitante">
                              <img src={jogo.timeVisitanteBandeiraUrl} alt={jogo.timeVisitanteNome} className="bandeira" />
                              <span>{jogo.timeVisitanteNome}</span>
                            </div>
                          </div>

                          <div className="jogo-meta">
                            <span>{jogo.estadioNome}</span>
                            <span className={`tag ${jogo.finalizado ? 'tag-ok' : 'tag-pend'}`}>
                              {jogo.finalizado ? '✓ Finalizado' : '⏳ Pendente'}
                            </span>
                          </div>
                        </div>

                        <div className="jogo-resultado">
                          <div className="label-mini">Resultado</div>
                          {jogo.golsCasa !== null && jogo.golsVisitante !== null ? (
                            <>
                              <span className="resultado">{jogo.golsCasa} × {jogo.golsVisitante}</span>
                              {jogo.penaltisCasa !== null && jogo.penaltisVisitante !== null && (
                                <div className="penaltis-mini">Pên: {jogo.penaltisCasa} × {jogo.penaltisVisitante}</div>
                              )}
                            </>
                          ) : (
                            <span>—</span>
                          )}
                        </div>

                        {!ehAdmin && (
                          <div className="jogo-palpite">
                            <div className="label-mini">Seu palpite</div>

                            <div className="palpite-wrap">
                              <input
                                type="number"
                                min="0"
                                value={palpites[jogo.id]?.golsCasa ?? ''}
                                onChange={(e) => atualizarPalpite(jogo.id, 'golsCasa', e.target.value)}
                                disabled={jogo.finalizado || palpitesJaEnviados}
                              />
                              <span className="palpite-vs">×</span>
                              <input
                                type="number"
                                min="0"
                                value={palpites[jogo.id]?.golsVisitante ?? ''}
                                onChange={(e) => atualizarPalpite(jogo.id, 'golsVisitante', e.target.value)}
                                disabled={jogo.finalizado || palpitesJaEnviados}
                              />
                            </div>

                            {ehMataMata(jogo) && (
                              <div className="classificado-wrap">
                                <label>Quem passa?</label>
                                <select
                                  value={palpites[jogo.id]?.classificadoPalpiteId ?? ''}
                                  onChange={(e) => atualizarPalpite(jogo.id, 'classificadoPalpiteId', e.target.value)}
                                  disabled={jogo.finalizado || palpitesJaEnviados}
                                >
                                  <option value="">Selecione</option>
                                  <option value={jogo.timeCasaId}>{jogo.timeCasaNome}</option>
                                  <option value={jogo.timeVisitanteId}>{jogo.timeVisitanteNome}</option>
                                </select>
                              </div>
                            )}

                            <div className="pontos-mini">
                              Pts: {palpites[jogo.id]?.pontosObtidos !== undefined ? palpites[jogo.id].pontosObtidos : '—'}
                            </div>
                          </div>
                        )}

                        <div className="jogo-acao">
                          {!ehAdmin && !jogo.finalizado && !palpitesJaEnviados && (
                            <button className="btn btn-primary btn-sm" onClick={() => salvarPalpite(jogo)}>Salvar</button>
                          )}

                          {!ehAdmin && palpitesJaEnviados && <span className="enviado-texto">✓ Enviado</span>}

                          {ehAdmin && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div className="label-mini">Resultado real</div>

                              <div className="palpite-wrap">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Casa"
                                  value={resultadosAdmin[jogo.id]?.golsCasa ?? ''}
                                  onChange={(e) => atualizarResultadoAdmin(jogo.id, 'golsCasa', e.target.value)}
                                />
                                <span className="palpite-vs">×</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Visit."
                                  value={resultadosAdmin[jogo.id]?.golsVisitante ?? ''}
                                  onChange={(e) => atualizarResultadoAdmin(jogo.id, 'golsVisitante', e.target.value)}
                                />
                              </div>

                              {ehMataMata(jogo) && (
                                <div className="palpite-wrap">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Pên C"
                                    value={resultadosAdmin[jogo.id]?.penaltisCasa ?? ''}
                                    onChange={(e) => atualizarResultadoAdmin(jogo.id, 'penaltisCasa', e.target.value)}
                                  />
                                  <span className="palpite-vs">×</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Pên V"
                                    value={resultadosAdmin[jogo.id]?.penaltisVisitante ?? ''}
                                    onChange={(e) => atualizarResultadoAdmin(jogo.id, 'penaltisVisitante', e.target.value)}
                                  />
                                </div>
                              )}

                              {!jogo.finalizado ? (
                                <button className="btn btn-primary btn-sm" onClick={() => finalizarResultado(jogo)}>Finalizar</button>
                              ) : (
                                <button className="btn btn-secondary btn-sm" onClick={() => corrigirResultado(jogo)}>Corrigir</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
