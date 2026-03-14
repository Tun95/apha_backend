-- Create briefings table
CREATE TABLE briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    analyst_name VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    generated BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on ticker for searches
CREATE INDEX idx_briefings_ticker ON briefings(ticker);
CREATE INDEX idx_briefings_created_at ON briefings(created_at DESC);

-- Create key points table
CREATE TABLE briefing_key_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    point_text TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_briefing_key_points_briefing FOREIGN KEY (briefing_id) REFERENCES briefings(id)
);

-- Create index for faster lookups
CREATE INDEX idx_key_points_briefing_id ON briefing_key_points(briefing_id);

-- Create risks table
CREATE TABLE briefing_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    risk_text TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_briefing_risks_briefing FOREIGN KEY (briefing_id) REFERENCES briefings(id)
);

CREATE INDEX idx_risks_briefing_id ON briefing_risks(briefing_id);

-- Create metrics table
CREATE TABLE briefing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_briefing_metrics_briefing FOREIGN KEY (briefing_id) REFERENCES briefings(id),
    -- Ensure metric names are unique within a briefing
    CONSTRAINT unique_metric_per_briefing UNIQUE (briefing_id, metric_name)
);

CREATE INDEX idx_metrics_briefing_id ON briefing_metrics(briefing_id);

-- Create a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_briefings_updated_at
    BEFORE UPDATE ON briefings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();