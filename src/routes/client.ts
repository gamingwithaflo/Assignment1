import express from "express";
import * as passportConfig from "../config/passport";

const clientRouter = express.Router();

// controllers
import * as homeController from "../controllers/home";
import * as whatIsReactController from "../controllers/whatisreact";
import * as gettingStartedController from "../controllers/gettingstarted";
import * as notableFeaturesController from "../controllers/notablefeatures";
import * as historyController from "../controllers/history";
import * as assessmentController from "../controllers/assessment";
import * as userController from "../controllers/user";

clientRouter.get("/", homeController.index);
clientRouter.get("/what-is-react", whatIsReactController.whatIsReact);
clientRouter.get("/getting-started", gettingStartedController.gettingStarted);
clientRouter.get(
  "/notable-features",
  notableFeaturesController.notableFeatures
);
clientRouter.get("/history", historyController.history);
clientRouter.get("/assessment", assessmentController.assessment);

// TODO
clientRouter.get(
  "/login",
  passportConfig.checkNotAuthenticated,
  userController.login
);
clientRouter.get(
  "/register",
  passportConfig.checkNotAuthenticated,
  userController.register
);
clientRouter.get(
  "/profile",
  passportConfig.isAuthenticated,
  userController.profile
);
clientRouter.post("/login", userController.postLogin);
clientRouter.post("/register", userController.postRegister);
clientRouter.post("/logout", userController.logout);

export default clientRouter;
