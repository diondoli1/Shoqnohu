-- =============================================================================
-- STEP 1 — In pgAdmin: connect to your PostgreSQL server, select database
-- "postgres", open Query Tool, run ONLY the block below (then Execute / F5).
-- =============================================================================

CREATE ROLE ledri WITH LOGIN PASSWORD 'admin123';

CREATE DATABASE shoqnohu OWNER ledri;

-- If you see "role already exists", delete the CREATE ROLE line and run again.
-- If you see "database already exists", skip STEP 1 and go to STEP 2.

-- =============================================================================
-- STEP 2 — In pgAdmin: in the left tree, open Databases → shoqnohu (click it),
-- then File → Query Tool (so the query runs *on* shoqnohu). Run this block:
-- =============================================================================

GRANT ALL ON SCHEMA public TO ledri;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ledri;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ledri;
