#!/bin/bash

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "Port $1 is already in use. Please free up the port and try again."
        exit 1
    fi
}

# Function to kill processes
cleanup() {
    echo "Shutting down servers..."
    if [ ! -z "$SPRING_PID" ]; then
        kill $SPRING_PID 2>/dev/null
    fi
    if [ ! -z "$VITE_PID" ]; then
        kill $VITE_PID 2>/dev/null
    fi
    exit 0
}

# Set up cleanup on script termination
trap cleanup INT TERM

# Check if required ports are available
check_port 8080  # Spring Boot default port
check_port 3000  # Vite default port

# Build and start Spring Boot server
echo "Building and starting Spring Boot server..."
cd backend
mvn clean install

if [ $? -ne 0 ]; then
    echo "Maven build failed. Exiting."
    exit 1
fi

mvn spring-boot:run &
SPRING_PID=$!

# Wait for Spring Boot to start
echo "Waiting for Spring Boot to start..."
while ! nc -z localhost 8080; do   
    sleep 1
done
echo "Spring Boot server is running on http://localhost:8080"

# Start Vite development server
echo "Starting Vite development server..."
cd ../frontend
npm install

if [ $? -ne 0 ]; then
    echo "NPM install failed. Exiting."
    cleanup
    exit 1
fi

npm run dev &
VITE_PID=$!

# Wait for Vite to start
echo "Waiting for Vite to start..."
while ! nc -z localhost 3000; do   
    sleep 1
done
echo "Vite server is running on http://localhost:3000"

echo "All servers are running. Press Ctrl+C to stop all servers."

# Keep the script running
wait