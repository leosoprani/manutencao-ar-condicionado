import Dexie from 'dexie';

export const db = new Dexie('MaintenanceDB');

db.version(1).stores({
  bairros: '++id, nome, cor',
  clientes: '++id, bairroId, nome, endereco, tipo, telefone, whatsapp',
  equipamentos: '++id, clienteId, marca, modelo, btu, localizacao, ultimaManutencao, proximaManutencao',
  manutencoes: '++id, equipamentoId, dataRealizada, descricao, proximaData'
});

// Seed data function
export async function seedDatabase() {
  const bairroCount = await db.bairros.count();
  if (bairroCount === 0) {
    const bairros = [
      "Aeroclube", "Água Fria", "Altiplano", "Alto do Mateus", "Bairro dos Estados", 
      "Bairro dos Ipês", "Bancários", "Bessa", "Brisamar", "Cabo Branco", 
      "Castelo Branco", "Centro", "Cristo Redentor", "Cruz das Armas", "Cuiá", 
      "Ernesto Geisel", "Expedicionários", "Funcionários", "Gramame", "Grotão", 
      "Ilha do Bispo", "Indústrias", "Jaguaribe", "Jardim Oceania", "José Américo", 
      "Manaíra", "Mandacaru", "Miramar", "Oitizeiro", "Padre Zé", "Rangel", 
      "Roger", "Tambaú", "Tambauzinho", "Tambiá", "Torre", "Varadouro", 
      "Valentina de Figueiredo", "Portal do Sol", "Jardim Luna", "João Agripino"
    ].map(nome => ({
      nome,
      cor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    }));
    
    for (const b of bairros) {
      const bId = await db.bairros.add(b);
      
      // Add a placeholder client for each neighborhood
      await db.clientes.add({
        bairroId: bId,
        nome: `Edifício ${b.nome} Prime`,
        endereco: `Av. Principal, 100 - ${b.nome}`,
        tipo: 'Edifício',
        telefone: '83 99999-0000',
        whatsapp: '83 99999-0000'
      });
    }
  }
}
