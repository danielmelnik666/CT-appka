CREATE TABLE IF NOT EXISTS detections (
    id                 SERIAL PRIMARY KEY,
    image_name         VARCHAR(255) NOT NULL,
    is_invasive        BOOLEAN      NOT NULL,
    confidence         FLOAT        NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    confidence_percent FLOAT        NOT NULL CHECK (confidence_percent >= 0 AND confidence_percent <= 100),
    message            TEXT,
    recommendation     TEXT,
    timestamp          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    client_ip          VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_detections_timestamp
    ON detections (timestamp DESC);
