begin;

create table public.launch_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 60),
  contact text not null check (
    contact = btrim(contact) and char_length(contact) between 3 and 254
    and (contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or regexp_replace(contact, '[[:space:]-]', '', 'g') ~ '^01[016789][0-9]{7,8}$')
  ),
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.launch_signups enable row level security;
alter table public.launch_signups force row level security;

revoke all on table public.launch_signups from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (name, contact, message) on table public.launch_signups to anon, authenticated;
grant all on table public.launch_signups to service_role;

create policy "Visitors may only submit a new signup"
  on public.launch_signups
  for insert
  to anon, authenticated
  with check (true);

comment on table public.launch_signups is '티켓체크 출시 알림 신청. 브라우저는 추가만 가능하고 조회·수정·삭제는 불가.';
notify pgrst, 'reload schema';

commit;
