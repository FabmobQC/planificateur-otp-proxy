# FabMobQC OTP proxy
This is a proxy server for OpenTripPlanner, made for the needs of Fabrique de mobilité Québec. It receives requests made to OpenTripPlanner and adapt its responses.

## Installation
1. Create a `.env` file in the same folder as `package.json` with the following mandatory environment variables:
``` shell
TAXI_API_KEY=taxi-api-key # The key to the taxi pricing API
OTP_ADDRESS=http://localhost:8080 # The address to the OpenTripPlanner server
```

2. Install the dependencies
```
npm install
```

## Run
```
npm start
```

The proxy server will listen on port 3000.
