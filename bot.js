const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = '1397983960142970951';
const ROL_ID = '1397996367972143114';

const eventos = [
  { nombre: 'KOTH', hora: '16:30', dias: ['lunes', 'domingo'], ubicacion: 'MinaPvP' },
  { nombre: 'Warden Assault', hora: '16:30', dias: ['miércoles', 'sábado'], ubicacion: '/warden join' },
  { nombre: 'Arena PvP', hora: '19:00', dias: ['lunes', 'jueves'], ubicacion: 'Arena PvP' },
  { nombre: 'Arena PvP', hora: '16:30', dias: ['martes', 'viernes'], ubicacion: 'Arena PvP' },
  { nombre: 'Arena PvP', hora: '19:00', dias: ['martes', 'domingo'], ubicacion: 'Arena PvP' },
  { nombre: 'Elarión', hora: '19:00', dias: ['jueves', 'sábado'], ubicacion: '/warp elarión' },
  { nombre: 'Ekzuma', hora: '19:00', dias: ['viernes', 'miércoles'], ubicacion: '/warp ekzuma' }
];

const bosses = ['Tempestad', 'Coloso', 'Goliat', 'Espectro', 'Leviathan'];
let bossIndex = 0;
const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
  client.user.setActivity('Eventos PvP y PvE 🔔', { type: 'WATCHING' });

  const commands = [
    new SlashCommandBuilder().setName('eventos').setDescription('Cuánto falta para el próximo evento PvP/PvE'),
    new SlashCommandBuilder().setName('bosses').setDescription('Cuánto falta para el próximo boss PvE'),
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('✅ Comandos registrados');

  setInterval(async () => {
    try {
      const res = await fetch('https://worldtimeapi.org/api/timezone/America/Argentina/Buenos_Aires');
      const data = await res.json();
      const ahora = new Date(data.datetime);
      const hora = ahora.toTimeString().slice(0,5);
      const dia = diasSemana[ahora.getDay()];
      const canal = await client.channels.fetch(CHANNEL_ID);
      if (!canal) return;

      eventos.forEach(evento => {
        if (evento.dias.includes(dia)) {
          const [hh, mm] = evento.hora.split(':').map(Number);
          const eventoDate = new Date(ahora);
          eventoDate.setHours(hh, mm, 0, 0);
          const diffMin = Math.floor((eventoDate - ahora) / 60000);

          if (diffMin === 10) {
            canal.send(`<@&${ROL_ID}> 🔔 ¡Faltan 10 minutos para **${evento.nombre}**!\n📍 ${evento.ubicacion}\n🕒 ${evento.hora}`);
          }
          if (diffMin === 0) {
            canal.send(`<@&${ROL_ID}> 🚨 ¡Comienza **${evento.nombre}**!\n📍 ${evento.ubicacion}\n🕒 ${evento.hora}`);
          }
        }
      });

      if (ahora.getMinutes() % 30 === 0 && ahora.getSeconds() === 0) {
        const boss = bosses[bossIndex];
        bossIndex = (bossIndex + 1) % bosses.length;
        canal.send(`<@&${ROL_ID}> ⚔️ ¡Apareció el boss **${boss}**!\n🕒 Hora: ${hora}\n💢 Prepárense para la acción PvE.`);
      }
    } catch (err) {
      console.error('Error obteniendo hora:', err.message);
    }
  }, 1000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const res = await fetch('https://worldtimeapi.org/api/timezone/America/Argentina/Buenos_Aires');
  const data = await res.json();
  const ahora = new Date(data.datetime);
  const dia = diasSemana[ahora.getDay()];

  if (interaction.commandName === 'eventos') {
    const proximos = eventos
      .filter(e => e.dias.includes(dia))
      .map(e => {
        const [hh, mm] = e.hora.split(':').map(Number);
        const eDate = new Date(ahora);
        eDate.setHours(hh, mm, 0, 0);
        const diff = Math.floor((eDate - ahora) / 60000);
        return { ...e, restante: diff };
      })
      .filter(e => e.restante >= 0)
      .sort((a, b) => a.restante - b.restante);

    if (proximos.length === 0) return interaction.reply('No hay eventos hoy.');
    const e = proximos[0];
    const horas = Math.floor(e.restante / 60);
    const minutos = e.restante % 60;
    return interaction.reply(`⏳ Próximo evento **${e.nombre}** en ${horas}h ${minutos}m\n📍 ${e.ubicacion} — 🕒 ${e.hora}`);
  }

  if (interaction.commandName === 'bosses') {
    const minutosPasados = ahora.getMinutes() % 30;
    const restante = 30 - minutosPasados;
    const proximo = bosses[bossIndex % bosses.length];
    return interaction.reply(`⏳ El próximo boss será **${proximo}** en ${restante} minutos.`);
  }
});

client.login(TOKEN);
