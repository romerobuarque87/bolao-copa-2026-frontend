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
  const [participantesPorBolao, setParticipantesPorBolao] = useState({})
  const [bolaoSelecionadoId, setBolaoSelecionadoId] = useState('')
  const [palpites, setPalpites] = useState({})
  const [resultadosAdmin, setResultadosAdmin] = useState({})
  const [codigoConvite, setCodigoConvite] = useState('')
  const [nomeNovoBolao, setNomeNovoBolao] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [palpitesParticipantes, setPalpitesParticipantes] = useState([])
  const [jogoAberto, setJogoAberto] = useState('')
  const [secoesAbertas, setSecoesAbertas] = useState({})
  const [secoesPalpitesAbertas, setSecoesPalpitesAbertas] = useState({})

  const navigate = useNavigate()

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
  if (bolaoSelecionadoId && usuario) {
    if (ehAdmin) {
      carregarRankingDoBolaoSelecionado(bolaoSelecionadoId)
    } else {
      carregarPalpitesDoBolao(bolaoSelecionadoId)
      carregarRankingDoBolaoSelecionado(bolaoSelecionadoId)
    }
  }
}, [bolaoSelecionadoId, boloes, usuario])

  async function carregarDados() {
  try {
    const usuarioResponse = await api.get('/auth/me')
    const usuarioLogado = usuarioResponse.data
    setUsuario(usuarioLogado)

    const admin = usuarioLogado.administrador === true

    let boloesCarregados = []

    if (admin) {
      const boloesResponse = await api.get('/boloes')

      boloesCarregados = (boloesResponse.data || []).map((bolao) => ({
        id: bolao.id,
        bolaoId: bolao.id,
        nomeBolao: bolao.nome,
        codigoConvite: bolao.codigoConvite,
        pontos: 0,
        palpitesEnviados: false,
      }))
    } else {
      const boloesResponse = await api.get(`/boloes/usuario/${usuarioLogado.id}`)
      boloesCarregados = boloesResponse.data || []
    }

    setBoloes(boloesCarregados)

    await carregarQuantidadeParticipantes(boloesCarregados)

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

    if (boloesCarregados.length > 0) {
      setBolaoSelecionadoId(String(boloesCarregados[0].id))
    } else {
      setBolaoSelecionadoId('')
      setRanking([])
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

      setPalpites((atuais) => ({
        ...atuais,
        ...mapeados,
      }))
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

  async function carregarQuantidadeParticipantes(boloesCarregados) {
    try {
      const contagens = {}

      await Promise.all(
        boloesCarregados.map(async (bolao) => {
          if (!bolao.bolaoId) {
            contagens[bolao.id] = 0
            return
          }

          try {
            const response = await api.get(`/ranking/bolao/${bolao.bolaoId}`)
            contagens[bolao.id] = response.data?.length || 0
          } catch {
            contagens[bolao.id] = 0
          }
        })
      )

      setParticipantesPorBolao(contagens)
    } catch {
      setParticipantesPorBolao({})
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

    if (jogoBloqueadoParaPalpite(jogo)) {
      setErro('O prazo para palpitar neste jogo já foi encerrado.')
      return
    }

    if (!palpite || palpite.golsCasa === '' || palpite.golsVisitante === '' || palpite.golsCasa === undefined || palpite.golsVisitante === undefined) {
      setErro('Informe os dois placares do palpite.')
      return
    }

    const classificadoPalpiteId = descobrirClassificadoDoPalpite(jogo, palpite)

    if (ehMataMata(jogo) && !classificadoPalpiteId) {
      setErro('Em jogo de mata-mata empatado, informe quem você acha que vai se classificar.')
      return
    }

    const dadosPalpite = {
      participanteBolaoId,
      jogoId: jogo.id,
      golsCasaPalpite: Number(palpite.golsCasa),
      golsVisitantePalpite: Number(palpite.golsVisitante),
      classificadoPalpiteId,
    }

    try {
      if (palpite.id) {
        await api.put(`/palpites/${palpite.id}`, {
          golsCasaPalpite: dadosPalpite.golsCasaPalpite,
          golsVisitantePalpite: dadosPalpite.golsVisitantePalpite,
          classificadoPalpiteId: dadosPalpite.classificadoPalpiteId,
        })
      } else {
        await api.post('/palpites', dadosPalpite)
      }

      setMensagem('Palpite salvo com sucesso! ✅')
      await carregarPalpitesDoBolao(participanteBolaoId)
      await carregarRankingDoBolaoSelecionado(participanteBolaoId)
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao salvar palpite.')
    }
  }

  async function salvarPalpitesPreenchidos() {
    setErro('')
    setMensagem('')

    if (!bolaoSelecionadoId) {
      setErro('Selecione um bolao antes de salvar os palpites.')
      return
    }

    const participanteBolaoId = Number(bolaoSelecionadoId)

    const jogosParaSalvar = jogos.filter((jogo) => {
      const palpite = palpites[jogo.id]
      const permitidoEditar = !jogoBloqueadoParaPalpite(jogo) && (!palpitesJaEnviados || ehMataMata(jogo))
      const placarPreenchido =
        palpite &&
        palpite.golsCasa !== '' &&
        palpite.golsVisitante !== '' &&
        palpite.golsCasa !== undefined &&
        palpite.golsVisitante !== undefined
      const classificadoOk = !ehMataMata(jogo) || Boolean(descobrirClassificadoDoPalpite(jogo, palpite))

      return permitidoEditar && placarPreenchido && classificadoOk
    })

    if (jogosParaSalvar.length === 0) {
      setErro('Preencha ao menos um palpite pendente antes de salvar.')
      return
    }

    try {
      for (const jogo of jogosParaSalvar) {
        const palpite = palpites[jogo.id]
        const dadosPalpite = {
          participanteBolaoId,
          jogoId: jogo.id,
          golsCasaPalpite: Number(palpite.golsCasa),
          golsVisitantePalpite: Number(palpite.golsVisitante),
          classificadoPalpiteId: descobrirClassificadoDoPalpite(jogo, palpite),
        }

        if (palpite.id) {
          await api.put(`/palpites/${palpite.id}`, {
            golsCasaPalpite: dadosPalpite.golsCasaPalpite,
            golsVisitantePalpite: dadosPalpite.golsVisitantePalpite,
            classificadoPalpiteId: dadosPalpite.classificadoPalpiteId,
          })
        } else {
          await api.post('/palpites', dadosPalpite)
        }
      }

      setMensagem(`${jogosParaSalvar.length} palpite(s) salvo(s) com sucesso.`)
      await carregarPalpitesDoBolao(participanteBolaoId)
      await carregarRankingDoBolaoSelecionado(participanteBolaoId)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErro(error.response?.data?.message || error.response?.data?.erro || error.response?.data || 'Erro ao salvar palpites.')
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

  async function copiarCodigoConvite(codigo) {
    setErro('')
    setMensagem('')

    if (!codigo) {
      setErro('Este bolão ainda não possui código de convite.')
      return
    }

    try {
      await navigator.clipboard.writeText(codigo)
      setMensagem(`Código ${codigo} copiado! Agora é só enviar para os participantes.`)
    } catch {
      setErro('Não foi possível copiar automaticamente. Selecione o código e copie manualmente.')
    }
  }

  async function carregarPalpitesParticipantes() {
  setErro('')
  setMensagem('')

  if (!meuBolao) {
    setErro('Selecione um bolão primeiro.')
    return
  }

  if (!ehAdmin && !palpitesJaEnviados) {
    setErro('Você só pode ver os palpites dos outros participantes depois de enviar os seus.')
    return
  }

  try {
    const response = await api.get(
      `/palpites/bolao/${meuBolao.bolaoId}/participante/${meuBolao.id}/enviados`
    )

    setPalpitesParticipantes(response.data || [])
    setMensagem('Palpites dos participantes carregados com sucesso.')
  } catch (error) {
    setErro(
      error.response?.data?.message ||
      error.response?.data?.erro ||
      error.response?.data ||
      'Erro ao carregar palpites dos participantes.'
    )
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

  function jogoBloqueadoParaPalpite(jogo) {
    if (jogo.finalizado) {
      return true
    }

    if (!jogo.dataHora) {
      return false
    }

    return new Date() >= new Date(jogo.dataHora)
  }

  function placarPalpitePreenchido(palpite) {
    return (
      palpite &&
      palpite.golsCasa !== '' &&
      palpite.golsVisitante !== '' &&
      palpite.golsCasa !== undefined &&
      palpite.golsVisitante !== undefined
    )
  }

  function palpiteMataMataEmpatado(jogo) {
    const palpite = palpites[jogo.id]

    if (!ehMataMata(jogo) || !placarPalpitePreenchido(palpite)) {
      return false
    }

    return Number(palpite.golsCasa) === Number(palpite.golsVisitante)
  }

  function descobrirClassificadoDoPalpite(jogo, palpite) {
    if (!ehMataMata(jogo)) {
      return null
    }

    if (!placarPalpitePreenchido(palpite)) {
      return null
    }

    const golsCasa = Number(palpite.golsCasa)
    const golsVisitante = Number(palpite.golsVisitante)

    if (golsCasa > golsVisitante) {
      return Number(jogo.timeCasaId)
    }

    if (golsVisitante > golsCasa) {
      return Number(jogo.timeVisitanteId)
    }

    return palpite.classificadoPalpiteId ? Number(palpite.classificadoPalpiteId) : null
  }

  function nomeClassificadoAutomatico(jogo) {
    const palpite = palpites[jogo.id]

    if (!ehMataMata(jogo) || !placarPalpitePreenchido(palpite)) {
      return ''
    }

    const golsCasa = Number(palpite.golsCasa)
    const golsVisitante = Number(palpite.golsVisitante)

    if (golsCasa > golsVisitante) {
      return jogo.timeCasaNome
    }

    if (golsVisitante > golsCasa) {
      return jogo.timeVisitanteNome
    }

    return ''
  }

  function ordemFase(fase) {
    const ordem = {
      DEZESSEIS_AVOS: 1,
      OITAVAS: 2,
      QUARTAS: 3,
      SEMIFINAL: 4,
      TERCEIRO_LUGAR: 5,
      FINAL: 6,
    }

    return ordem[fase] || 99
  }

  function montarSecoesJogos(origem) {
    const secoes = []

    Object.entries(origem).forEach(([grupo, jogosDoGrupo]) => {
      if (grupo !== 'MATA-MATA') {
        secoes.push({
          chave: `GRUPO-${grupo}`,
          titulo: `Grupo ${grupo}`,
          jogos: jogosDoGrupo,
        })
        return
      }

      const porFase = {}
      jogosDoGrupo.forEach((jogo) => {
        if (!porFase[jogo.fase]) porFase[jogo.fase] = []
        porFase[jogo.fase].push(jogo)
      })

      Object.entries(porFase)
        .sort(([faseA], [faseB]) => ordemFase(faseA) - ordemFase(faseB))
        .forEach(([fase, jogosDaFase]) => {
          secoes.push({
            chave: `MATA-${fase}`,
            titulo: formatarFase(fase),
            jogos: jogosDaFase,
          })
        })
    })

    return secoes
  }

  function secaoEstaAberta(secao) {
    if (secoesAbertas[secao.chave] !== undefined) {
      return secoesAbertas[secao.chave]
    }

    return secao.jogos.some((jogo) => !jogo.finalizado)
  }

  function alternarSecao(chave, abertaAtual) {
    setSecoesAbertas((atual) => ({
      ...atual,
      [chave]: !abertaAtual,
    }))
  }

  function secaoPalpitesEstaAberta(secao) {
    if (secoesPalpitesAbertas[secao.chave] !== undefined) {
      return secoesPalpitesAbertas[secao.chave]
    }

    return secao.jogos.some((jogo) => !jogo.finalizado)
  }

  function alternarSecaoPalpites(chave, abertaAtual) {
    setSecoesPalpitesAbertas((atual) => ({
      ...atual,
      [chave]: !abertaAtual,
    }))
  }

  function rankClass(pos) {
    if (pos === 1) return 'rank-pos ouro'
    if (pos === 2) return 'rank-pos prata'
    if (pos === 3) return 'rank-pos bronze'
    return 'rank-pos'
  }

  function chipClass(pts) {
    if (pts >= 10) return 'pp-chip pp-p10'
    if (pts >= 7) return 'pp-chip pp-p7'
    if (pts >= 5) return 'pp-chip pp-p5'
    if (pts >= 2) return 'pp-chip pp-p2'
    return 'pp-chip pp-p0'
  }

  function acertoLabel(jogo, palpite) {
    const exato =
      palpite.golsCasaPalpite === jogo.golsCasa &&
      palpite.golsVisitantePalpite === jogo.golsVisitante
    if (exato) return '🎯 Placar exato'

    const sinal = (a, b) => Math.sign(a - b)
    const acertouResultado =
      sinal(jogo.golsCasa, jogo.golsVisitante) ===
      sinal(palpite.golsCasaPalpite, palpite.golsVisitantePalpite)
    const acertouGol =
      palpite.golsCasaPalpite === jogo.golsCasa ||
      palpite.golsVisitantePalpite === jogo.golsVisitante

    const partes = []
    if (acertouResultado) partes.push('✅ Resultado')
    if (acertouGol) partes.push('🟡 Gol exato')
    return partes.join(' + ') || '—'
  }

  function statsJogo(palpitesDoJogo) {
    let exato = 0
    let resultado = 0
    let melhor = null
    palpitesDoJogo.forEach((p) => {
      const pts = p.pontosObtidos ?? 0
      if (pts >= 10) exato++
      if (pts >= 5) resultado++
      if (!melhor || pts > (melhor.pontosObtidos ?? 0)) melhor = p
    })
    return { exato, resultado, melhor }
  }

  function ordenarPalpites(lista) {
    return [...lista].sort(
      (a, b) =>
        (b.pontosObtidos ?? 0) - (a.pontosObtidos ?? 0) ||
        (a.nomeUsuario || '').localeCompare(b.nomeUsuario || '')
    )
  }

  const ehAdmin = usuario?.administrador === true
  const meuBolao = boloes.find((b) => String(b.id) === String(bolaoSelecionadoId))
  const meuRanking = ranking.find((r) => r.nomeUsuario === usuario?.nome)
  const palpitesJaEnviados = meuBolao?.palpitesEnviados === true

  const palpitesPorJogo = {}
  palpitesParticipantes.forEach((p) => {
    if (!palpitesPorJogo[p.jogoId]) palpitesPorJogo[p.jogoId] = []
    palpitesPorJogo[p.jogoId].push(p)
  })

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
                    {ehAdmin ? 'Administrador' : 'Participante'}
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
            {ehAdmin ? 'Administração de Bolões' : 'Meus Bolões'}
          </div>

          {boloes.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">⚽</div>
              <p>
                {ehAdmin
                  ? 'Nenhum bolão cadastrado ainda.'
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
                    <th>Participantes</th>
                    <th>Pontos</th>
                    <th>Palpites</th>
                    <th>Ação</th>
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
                      <td style={{ fontWeight: 700, color: 'var(--verde-escuro)' }}>
                        {participantesPorBolao[bolao.id] ?? 0}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--verde-escuro)' }}>{bolao.pontos}</td>
                      <td>
                        <span className={`tag ${bolao.palpitesEnviados ? 'tag-ok' : 'tag-pend'}`}>
                          {bolao.palpitesEnviados ? 'Enviados' : 'Pendentes'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => copiarCodigoConvite(bolao.codigoConvite)}
                        >
                          Copiar código
                        </button>
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
            {ehAdmin ? 'Ranking e Participantes' : 'Ranking do Bolão'}
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
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={salvarPalpitesPreenchidos}
                  style={{ marginLeft: 12 }}
                >
                  Salvar palpites preenchidos
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={enviarPalpites}
                  disabled={palpitesJaEnviados}
                  style={{ marginLeft: 12 }}
                >
                  {palpitesJaEnviados ? 'Palpites Enviados' : 'Enviar Palpites'}
                </button>
              </>
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
                          {item.posicao === 1 ? '\uD83E\uDD47' : item.posicao === 2 ? '\uD83E\uDD48' : item.posicao === 3 ? '\uD83E\uDD49' : `${item.posicao}\u00ba`}
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
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">👀 Palpites dos Participantes</div>

          <div style={{ marginBottom: 15 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={carregarPalpitesParticipantes}
              disabled={!ehAdmin && !palpitesJaEnviados}
            >
              Ver palpites enviados
            </button>
          </div>

          {!ehAdmin && !palpitesJaEnviados && (
            <div className="empty">
              <div className="empty-icon">🔒</div>
              <p>Você só poderá ver os palpites dos outros participantes depois de enviar os seus.</p>
            </div>
          )}

          {palpitesParticipantes.length > 0 && (
            <div className="grupos-wrap">
              {montarSecoesJogos(jogosPorGrupo).map((secao) => {
                const jogosComPalpite = secao.jogos.filter(
                  (j) => (palpitesPorJogo[j.id] || []).length > 0
                )
                if (jogosComPalpite.length === 0) return null

                const secaoComPalpites = {
                  ...secao,
                  chave: `PALPITES-${secao.chave}`,
                  jogos: jogosComPalpite,
                }
                const aberta = secaoPalpitesEstaAberta(secaoComPalpites)
                const finalizados = jogosComPalpite.filter((j) => j.finalizado).length

                return (
                  <div className="grupo-card" key={secaoComPalpites.chave} style={{ marginBottom: 16 }}>
                    <button
                      type="button"
                      className="grupo-header grupo-header-btn"
                      onClick={() => alternarSecaoPalpites(secaoComPalpites.chave, aberta)}
                    >
                      <span>{secao.titulo}</span>
                      <small>{jogosComPalpite.length} jogos · {finalizados} finalizados</small>
                      <span className="grupo-chevron">{aberta ? '▲' : '▼'}</span>
                    </button>

                    {aberta && (
                      <div className="grupo-jogos">
                        {jogosComPalpite.map((jogo) => {
                          const palpitesDoJogo = ordenarPalpites(palpitesPorJogo[jogo.id] || [])
                          const aberto = jogoAberto === jogo.id
                          const st = jogo.finalizado ? statsJogo(palpitesDoJogo) : null

                          return (
                            <div className={`pp-jogo ${aberto ? 'aberto' : ''}`} key={jogo.id}>
                              <div
                                className="pp-jogo-head"
                                onClick={() => setJogoAberto(aberto ? '' : jogo.id)}
                              >
                                <div>
                                  <div className="pp-confronto">
                                    {jogo.timeCasaNome}
                                    {jogo.finalizado ? (
                                      <span className="pp-placar">{jogo.golsCasa} × {jogo.golsVisitante}</span>
                                    ) : (
                                      <span className="pp-placar"> × </span>
                                    )}
                                    {jogo.timeVisitanteNome}
                                  </div>
                                  <div className="pp-meta">
                                    {ehMataMata(jogo) ? formatarFase(jogo.fase) : secao.titulo} · {formatarData(jogo.dataHora)}
                                  </div>
                                  {jogo.finalizado ? (
                                    <div className="pp-stats">
                                      🎯 <b>{st.exato}</b> placar exato · ✅ <b>{st.resultado}</b> acertaram o resultado
                                      {st.melhor && (
                                        <> · 🏅 melhor: <b>{st.melhor.nomeUsuario}</b> ({st.melhor.pontosObtidos} pts)</>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="pp-stats">Jogo ainda não finalizado — {palpitesDoJogo.length} palpites</div>
                                  )}
                                </div>

                                <div className="pp-right">
                                  <span className={`tag ${jogo.finalizado ? 'tag-ok' : 'tag-pend'}`}>
                                    {jogo.finalizado ? 'Finalizado' : 'Pendente'}
                                  </span>
                                  <span className="pp-chev">▼</span>
                                </div>
                              </div>

                              {aberto && (
                                <div className="pp-body">
                                  <div className="table-wrap">
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>#</th>
                                          <th>Participante</th>
                                          <th>Palpite</th>
                                          {ehMataMata(jogo) && <th>Classificado</th>}
                                          <th>Acerto</th>
                                          <th>Pontos</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {palpitesDoJogo.map((p, i) => (
                                          <tr key={p.id}>
                                            <td>{jogo.finalizado ? i + 1 : '—'}</td>
                                            <td>{p.nomeUsuario}</td>
                                            <td className="pp-pal">{p.golsCasaPalpite} × {p.golsVisitantePalpite}</td>
                                            {ehMataMata(jogo) && <td>{p.classificadoPalpiteNome || '-'}</td>}
                                            <td className="pp-acerto">
                                              {jogo.finalizado ? acertoLabel(jogo, p) : 'aguardando'}
                                            </td>
                                            <td>
                                              {jogo.finalizado ? (
                                                <span className={chipClass(p.pontosObtidos ?? 0)}>{p.pontosObtidos ?? 0}</span>
                                              ) : (
                                                '—'
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            {ehAdmin ? 'Administração de Jogos e Resultados' : 'Meus Palpites'}
          </div>

          {jogos.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📅</div>
              <p>Nenhum jogo cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grupos-wrap">
              {montarSecoesJogos(jogosPorGrupo).map((secao) => {
                const aberta = secaoEstaAberta(secao)
                const finalizados = secao.jogos.filter((jogo) => jogo.finalizado).length

                return (
                <div className="grupo-card" key={secao.chave}>
                  <button
                    type="button"
                    className="grupo-header grupo-header-btn"
                    onClick={() => alternarSecao(secao.chave, aberta)}
                  >
                    <span>{secao.titulo}</span>
                    <small>{secao.jogos.length} jogos · {finalizados} finalizados</small>
                    <span className="grupo-chevron">{aberta ? '▲' : '▼'}</span>
                  </button>

                  {aberta && (
                  <div className="grupo-jogos">
                    {secao.jogos.map((jogo) => (
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
                              {jogo.finalizado ? 'Finalizado' : 'Pendente'}
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
                                disabled={jogoBloqueadoParaPalpite(jogo) || (palpitesJaEnviados && !ehMataMata(jogo))}
                              />
                              <span className="palpite-vs">×</span>
                              <input
                                type="number"
                                min="0"
                                value={palpites[jogo.id]?.golsVisitante ?? ''}
                                onChange={(e) => atualizarPalpite(jogo.id, 'golsVisitante', e.target.value)}
                                disabled={jogoBloqueadoParaPalpite(jogo) || (palpitesJaEnviados && !ehMataMata(jogo))}
                              />
                            </div>

                            {ehMataMata(jogo) && palpiteMataMataEmpatado(jogo) && (
                              <div className="classificado-wrap">
                                <label>Quem passa?</label>
                                <select
                                  value={palpites[jogo.id]?.classificadoPalpiteId ?? ''}
                                  onChange={(e) => atualizarPalpite(jogo.id, 'classificadoPalpiteId', e.target.value)}
                                  disabled={jogoBloqueadoParaPalpite(jogo) || (palpitesJaEnviados && !ehMataMata(jogo))}
                                >
                                  <option value="">Selecione</option>
                                  <option value={jogo.timeCasaId}>{jogo.timeCasaNome}</option>
                                  <option value={jogo.timeVisitanteId}>{jogo.timeVisitanteNome}</option>
                                </select>
                              </div>
                            )}

                            {ehMataMata(jogo) && nomeClassificadoAutomatico(jogo) && (
                              <div className="classificado-wrap">
                                <label>Classifica</label>
                                <strong>{nomeClassificadoAutomatico(jogo)}</strong>
                              </div>
                            )}

                            <div className="pontos-mini">
                              Pts: {palpites[jogo.id]?.pontosObtidos !== undefined ? palpites[jogo.id].pontosObtidos : '—'}
                            </div>
                          </div>
                        )}

                        <div className="jogo-acao">
                          {!ehAdmin && !jogoBloqueadoParaPalpite(jogo) && (!palpitesJaEnviados || ehMataMata(jogo)) && (
                            <button className="btn btn-primary btn-sm" onClick={() => salvarPalpite(jogo)}>
                              {palpites[jogo.id]?.id ? 'Alterar' : 'Salvar'}
                            </button>
                          )}

                          {!ehAdmin && palpitesJaEnviados && !ehMataMata(jogo) && <span className="enviado-texto">Enviado</span>}

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
                  )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
