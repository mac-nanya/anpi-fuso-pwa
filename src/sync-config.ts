import { createRemote } from "./sync";
import { supabase } from "./admin";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const remote = url && key ? createRemote(url, key, async () => (await supabase?.auth.getSession())?.data.session?.access_token) : null;
