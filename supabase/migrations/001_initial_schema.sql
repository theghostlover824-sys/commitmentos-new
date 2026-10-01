-- CommitmentOS initial schema
-- Apply with Supabase migrations after creating a project.

create type public.commitment_status as enum ('not_started', 'in_progress', 'waiting', 'complete');

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  owner text not null default 'You',
  due_date date not null,
  status public.commitment_status not null default 'not_started',
  confidence smallint not null default 80 check (confidence between 0 and 100),
  source text not null default 'Other',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index commitments_user_due_date_idx on public.commitments(user_id, due_date);
create index commitments_user_status_idx on public.commitments(user_id, status);

alter table public.commitments enable row level security;

create policy "Users can view their own commitments"
  on public.commitments for select
  using (auth.uid() = user_id);

create policy "Users can create their own commitments"
  on public.commitments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own commitments"
  on public.commitments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own commitments"
  on public.commitments for delete
  using (auth.uid() = user_id);

create or replace function public.set_commitment_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  if new.status = 'complete' and old.status <> 'complete' then
    new.completed_at = timezone('utc', now());
  elsif new.status <> 'complete' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger commitments_timestamps
  before update on public.commitments
  for each row execute procedure public.set_commitment_timestamps();
