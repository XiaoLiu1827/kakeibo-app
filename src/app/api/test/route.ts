import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("categories").select("*");
  return Response.json({ data, error });
}
