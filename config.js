// Configuración de Supabase
const SUPABASE_URL = 'https://jgcpbejvrsufjixlhkrj.supabase.co';  // Reemplaza con tu URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnY3BiZWp2cnN1ZmppeGxoa3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTU1NTcsImV4cCI6MjA3NDIzMTU1N30.2J9cPe43orExDdv-1HATtNPGsaKiq3qPoPkLHujTWo8';  // Reemplaza con tu key

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuración de Telegram
const TELEGRAM_TOKEN = '7950188080:AAENYC8bWAn8mqHQv0nuX1DPsPg0Vf45-MQ';
const TELEGRAM_CHAT_ID = '709834620';

