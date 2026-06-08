require('dotenv').config();
const { ready, run, query } = require('./src/database/sqlite');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await ready;
    console.log('🧹 Limpando banco...');

    run('DELETE FROM itens_ordem');
    run('DELETE FROM ordens');
    run('DELETE FROM produtos');
    run('DELETE FROM clientes');
    run('DELETE FROM usuarios');

    try {
      run("DELETE FROM sqlite_sequence WHERE name IN ('itens_ordem','ordens','produtos','clientes','usuarios')");
    } catch(_) { }

    console.log('✅ Banco limpo');

    const hash = await bcrypt.hash('123456', 10);

    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Administrador Master', 'admin@metaltech.com', hash, 'Administrador']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Operador Comercial', 'operador@metaltech.com', hash, 'Operador']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Líder de Produção', 'lider@metaltech.com', hash, 'Lider']);

    console.log('✅ 3 usuários criados');

    const clientes = [
      ['AutoPeças Brasil Ltda',       '11991230001', {rua:'Av. Industrial',numero:'1200',bairro:'Distrito Industrial',cidade:'São Paulo',cep:'01000-000'}, 'Pedidos urgentes com 24h de prazo'],
      ['Construtora Norte S.A.',      '11991230002', {rua:'Rua das Obras',numero:'500',bairro:'Centro',cidade:'Campinas',cep:'13000-000'}, ''],
      ['Metalúrgica Omega',           '11991230003', {rua:'Rua do Aço',numero:'88',bairro:'Vila Industrial',cidade:'Santo André',cep:'09000-000'}, 'Cliente VIP - prioridade máxima'],
      ['Indústria Ferreira & Filhos', '11991230004', {rua:'Av. das Fábricas',numero:'300',bairro:'Parque Industrial',cidade:'Mauá',cep:'09300-000'}, ''],
      ['TechMotor Componentes',       '11991230005', {rua:'Rua Mecânica',numero:'45',bairro:'Bairro Industrial',cidade:'São Bernardo',cep:'09700-000'}, 'Peças de alta precisão'],
      ['Hidráulica Paulista',         '11991230006', {rua:'Av. Hidráulica',numero:'210',bairro:'Centro',cidade:'Guarulhos',cep:'07000-000'}, ''],
      ['Agrotech Máquinas',           '11991230007', {rua:'Estrada Rural',numero:'1500',bairro:'Zona Rural',cidade:'Jundiaí',cep:'13200-000'}, 'Entrega apenas às terças'],
      ['Transportes Pesados S.A.',    '11991230008', {rua:'Rodovia SP-330',numero:'km 45',bairro:'Marginal',cidade:'Ribeirão Preto',cep:'14000-000'}, ''],
      ['Estruturas Metálicas RS',     '11991230009', {rua:'Rua do Ferro',numero:'920',bairro:'Industrial',cidade:'São Carlos',cep:'13560-000'}, 'Pedidos em lote'],
      ['Manutenção Industrial JM',    '11991230010', {rua:'Rua da Manutenção',numero:'33',bairro:'Centro',cidade:'Sorocaba',cep:'18000-000'}, ''],
    ];

    for (const [nome, tel, end, obs] of clientes) {
      run('INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES (?, ?, ?, ?)',
        [nome, tel, JSON.stringify(end), obs]);
    }
    console.log('✅ 10 clientes criados');

    const produtos = [
      ['Eixo de Transmissão',      'Eixo para transmissão de torque em sistemas industriais',     'Aço SAE 1045, diâmetro 50mm, comprimento 500mm, tolerância H7',          120.00, 'usinagem'],
      ['Engrenagem Cônica',        'Engrenagem para redução de velocidade e transmissão de força', 'Módulo 3, 24 dentes, aço 4340 tratado termicamente',                      85.00, 'usinagem'],
      ['Flange de Acoplamento',    'Flange para conexão entre eixos e tubulações',                 'Aço carbono, furação padrão ANSI B16.5, classe 150',                      65.00, 'usinagem'],
      ['Bucha de Bronze',          'Bucha autolubrificante para mancais de deslizamento',           'Bronze TM23, diâmetro interno 30mm, externo 40mm, comprimento 60mm',      28.00, 'usinagem'],
      ['Parafuso Especial M20',    'Parafuso de alta resistência para aplicações estruturais',      'Aço grau 12.9, rosca M20x2.5, comprimento 150mm, zincado',               18.50, 'usinagem'],
      ['Chapa Perfurada 3mm',      'Chapa metálica com padrão de furação para filtragem',           'Aço inox 304, espessura 3mm, furos Ø6mm, passo 10mm',                    95.00, 'corte'],
      ['Suporte Soldado L200',     'Suporte estrutural em L para fixação de equipamentos',          'Aço A36, abas 200x200mm, espessura 8mm, pintura epóxi',                  72.00, 'solda'],
      ['Tampa de Inspeção',        'Tampa removível para acesso a componentes internos',            'Alumínio 6061-T6, 300x300mm, vedação EPDM, 4 fixadores',                 110.00, 'usinagem'],
      ['Pino de Cisalhamento',     'Pino de segurança para proteção de componentes',               'Aço 1020, diâmetro 12mm, comprimento 80mm, têmpera superficial',          15.00, 'usinagem'],
      ['Estrutura Tubular 40x40',  'Estrutura em tubo quadrado para suporte de equipamentos',       'Tubo quadrado 40x40x3mm, aço carbono, galvanizado a fogo',               180.00, 'solda'],
      ['Polias de Transmissão',    'Polia para transmissão por correia V em redutores',             'Ferro fundido GH-190, diâmetro 200mm, canal B simples',                   95.00, 'fundição'],
      ['Garra de Fixação CNC',     'Garra de fixação para peças em centros de usinagem CNC',       'Aço ferramenta D2, dureza 60 HRC, mandíbulas intercambiáveis',            320.00, 'usinagem'],
      ['Acoplamento Elástico',     'Acoplamento com elemento elástico para absorção de choques',   'Corpo em aço, elemento em poliuretano Shore 80A, torque máx 150Nm',       145.00, 'montagem'],
      ['Suporte Mancal SNL 508',   'Suporte de mancal para rolamento de rolos cônico',              'Ferro fundido, alinhamento automático, fixação 4 parafusos M16',           88.00, 'fundição'],
      ['Cilindro Hidráulico 50mm', 'Cilindro hidráulico de simples efeito para automação',          'Diâmetro êmbolo 50mm, curso 200mm, pressão máx 200 bar, vedação NBR',    420.00, 'montagem'],
    ];

    for (const [nome, desc, espec, preco, cat] of produtos) {
      run('INSERT INTO produtos (nome, descricao, especificacoes, preco_unitario, categoria) VALUES (?, ?, ?, ?, ?)',
        [nome, desc, espec, preco, cat]);
    }
    console.log('✅ 15 produtos criados');

    console.log('======================================');
    console.log('🏭 SEED EXECUTADO COM SUCESSO!');
    console.log('======================================');
    console.log('Admin:    admin@metaltech.com   | Senha: 123456');
    console.log('Operador: operador@metaltech.com | Senha: 123456');
    console.log('Líder:    lider@metaltech.com   | Senha: 123456');
    console.log('======================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO NO SEED:', err);
    process.exit(1);
  }
}

seed();