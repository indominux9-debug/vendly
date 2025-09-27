// Configuración de Supabase
const SUPABASE_URL = 'https://jgcpbejvrsufjixlhkrj.supabase.co';  // Reemplaza con tu URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnY3BiZWp2cnN1ZmppeGxoa3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTU1NTcsImV4cCI6MjA3NDIzMTU1N30.2J9cPe43orExDdv-1HATtNPGsaKiq3qPoPkLHujTWo8';  // Reemplaza con tu key

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);