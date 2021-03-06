import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import client from 'prom-client';
import config from './config';
import {LogInfo} from "./logger";
import { enforceAzureADMiddleware } from "./auth/middleware";


const BUILD_PATH = path.join(__dirname, "../dist");
const PORT = process.env.PORT || 3000;
const server = express();

const startServer = () => {
  // Create a Registry which registers the metrics
  const register = new client.Registry();
  // Add a default label which is added to all metrics
  register.setDefaultLabels({
    app: 'aap-innsyn-dittnav'
  });// Enable the collection of default metrics
  client.collectDefaultMetrics({ register });

  server.use(cookieParser());
  server.use(express.static(BUILD_PATH));

  // metrics
  server.get(`${config.BASE_PATH}/internal/metrics`, async (req: any, res: any) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  // health checks
  server.get([`${config.BASE_PATH}/internal/isAlive`, `${config.BASE_PATH}/internal/isReady`], (req: any, res: any) =>
    res.sendStatus(200)
  );

  // Enforce Azure AD authentication
  server.use(`${config.BASE_PATH}/*`, enforceAzureADMiddleware);

  // Render app
  server.get(`${config.BASE_PATH}/*`, (req: any, res: any) =>
      res.sendFile(path.join(BUILD_PATH, 'index.html'))
  );

  server.listen(PORT, () => {
    LogInfo(`Server started: listening on port ${PORT}`);
  });
};

startServer();
