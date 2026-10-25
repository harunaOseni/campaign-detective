CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE TABLE IF NOT EXISTS investigations (
 id uuid PRIMARY KEY, request_key text UNIQUE NOT NULL, question text NOT NULL, dataset text NOT NULL,
 status text NOT NULL DEFAULT 'queued', stage text NOT NULL DEFAULT 'Queued', checkpoint jsonb NOT NULL DEFAULT '{}',
 result jsonb, error text, created_at timestamptz DEFAULT now(), started_at timestamptz, finished_at timestamptz,
 attempts int NOT NULL DEFAULT 0, fence int NOT NULL DEFAULT 0, owner text, lease_until timestamptz,
 model_calls int NOT NULL DEFAULT 0, input_tokens bigint NOT NULL DEFAULT 0, output_tokens bigint NOT NULL DEFAULT 0,
 query_count int NOT NULL DEFAULT 0, query_ms double precision NOT NULL DEFAULT 0,
 feedback text, saved boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS jobs_queue ON investigations(status,created_at);
CREATE TABLE IF NOT EXISTS events(id bigserial PRIMARY KEY, job_id uuid REFERENCES investigations(id), at timestamptz DEFAULT now(), stage text NOT NULL, detail text NOT NULL);
CREATE INDEX IF NOT EXISTS events_job ON events(job_id,id);
CREATE TABLE IF NOT EXISTS benchmarks(id bigserial PRIMARY KEY, at timestamptz DEFAULT now(), result jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS warehouse.orders(id bigint PRIMARY KEY,dataset text NOT NULL, order_id bigint NOT NULL, day date NOT NULL,campaign text NOT NULL, segment text NOT NULL, net_revenue numeric NOT NULL,reported_at date NOT NULL);
CREATE INDEX IF NOT EXISTS orders_dataset_day ON warehouse.orders(dataset,day);
CREATE TABLE IF NOT EXISTS warehouse.ads(dataset text,campaign text,day date,spend numeric,clicks int,PRIMARY KEY(dataset,campaign,day));
CREATE TABLE IF NOT EXISTS warehouse.inventory(dataset text,campaign text,day date,available int,PRIMARY KEY(dataset,campaign,day));
CREATE TABLE IF NOT EXISTS warehouse.metadata(key text PRIMARY KEY,value text);
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='warehouse_reader') THEN CREATE ROLE warehouse_reader LOGIN PASSWORD 'local_reader_only'; END IF; END $$;
GRANT USAGE ON SCHEMA warehouse TO warehouse_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA warehouse TO warehouse_reader;
ALTER ROLE warehouse_reader SET default_transaction_read_only=on;
ALTER ROLE warehouse_reader SET statement_timeout='5s';
CREATE TABLE IF NOT EXISTS model_leases(id uuid PRIMARY KEY,expires_at timestamptz NOT NULL);
