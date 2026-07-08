import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xhqlknxdtikznpbolsjg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhocWxrbnhkdGlrem5wYm9sc2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MjQ0NjksImV4cCI6MjA5OTEwMDQ2OX0.a38IAlp3m__a7fo2M0EL-nS4q9jxJskJTF1vfqgqCy0';

export const supabase = createClient(supabaseUrl, supabaseKey);
