-- Drop tables in reverse order (dependencies first)
DROP TABLE IF EXISTS briefing_metrics;
DROP TABLE IF EXISTS briefing_risks;
DROP TABLE IF EXISTS briefing_key_points;
DROP TABLE IF EXISTS briefings;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();