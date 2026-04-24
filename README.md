# ❄️ App Premium de Gestão de Ar-Condicionado

Aplicativo premium para gestão de clientes e manutenção de aparelhos de ar-condicionado. Desenvolvido com foco em alta performance e uso totalmente offline (Offline-First), ideal para técnicos em campo no Android e iOS (via PWA).

## ✨ Funcionalidades

- 📍 **Painel de Bairros:** Organize e visualize as pendências, clientes e propriedades por região.
- 🛠️ **Gestão de Equipamentos:** Cadastro rápido de aparelhos (com logotipos das principais marcas do mercado e capacidades em BTU).
- 📅 **Agenda e Histórico:** Agendamento de próximas visitas (preventivas e corretivas) com histórico completo do que foi realizado.
- ⚡ **Offline-First:** Funciona 100% sem internet. Todos os dados são salvos no próprio dispositivo utilizando IndexedDB.
- 💎 **Interface Premium:** Design moderno baseado na estética Obsidian, utilizando *Glassmorphism* e *Dark Mode*.
- 💾 **Backup e Restauração:** Sistema integrado para exportar a base de dados em JSON e restaurar quando trocar de aparelho.

## 🚀 Tecnologias Utilizadas

- **Frontend:** Vanilla JavaScript, HTML5, CSS3.
- **Banco de Dados Local:** [Dexie.js](https://dexie.org/) (Wrapper para IndexedDB).
- **Ferramentas:** Vite (Build tool para carregamento ultra-rápido).
- **Design:** Avatares dinâmicos com a API do DiceBear.

## 💻 Como rodar o projeto na sua máquina

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado no seu computador.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/leosoprani/manutencao-ar-condicionado.git
   ```

2. **Acesse a pasta do projeto:**
   ```bash
   cd manutencao-ar-condicionado
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## ‍💻 Desenvolvedor

Criado e mantido por **Leonardo Soprani**.
Desenvolvedor Full Stack • 2026