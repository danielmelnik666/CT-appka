CREATE TABLE IF NOT EXISTS detections (
    id SERIAL PRIMARY KEY,
    image_name VARCHAR(255),
    is_invasive BOOLEAN NOT NULL,
    confidence FLOAT NOT NULL,
    confidence_percent FLOAT NOT NULL,
    message TEXT,
    recommendation TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    client_ip VARCHAR(45)
);
