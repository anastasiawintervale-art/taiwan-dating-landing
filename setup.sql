create table if not exists public.site_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

create policy "Public can read landing content"
on public.site_content for select
to anon, authenticated
using (true);

create policy "Authenticated admins can insert content"
on public.site_content for insert
to authenticated
with check (true);

create policy "Authenticated admins can update content"
on public.site_content for update
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

create policy "Public can view site assets"
on storage.objects for select
to public
using (bucket_id = 'site-assets');

create policy "Authenticated admins can upload site assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-assets');

create policy "Authenticated admins can update site assets"
on storage.objects for update
to authenticated
using (bucket_id = 'site-assets')
with check (bucket_id = 'site-assets');

create policy "Authenticated admins can delete site assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-assets');
