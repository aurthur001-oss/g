
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking Supabase tables...');
  
  const { data, error } = await supabase
    .from('nodes')
    .select('count', { count: 'exact', head: true });

  if (error) {
    console.error('Error accessing "nodes" table:', error.code, error.message);
    if (error.code === '42P01') {
      console.log('CONFIRMED: Table "nodes" does not exist.');
    }
  } else {
    console.log('SUCCESS: Table "nodes" exists.');
  }

  const { error: sigError } = await supabase
    .from('meeting_signaling')
    .select('count', { count: 'exact', head: true });

  if (sigError) {
    console.error('Error accessing "meeting_signaling" table:', sigError.code, sigError.message);
  } else {
    console.log('SUCCESS: Table "meeting_signaling" exists.');
  }
}

checkTables();
