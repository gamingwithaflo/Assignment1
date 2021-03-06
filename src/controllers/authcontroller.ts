/*

Authcontroller handles
  user registration,
  user/session login,
  password hashing,
  and changing user email/name.

*/

import {getRepository, Repository} from "typeorm";
import User from "../entity/user";
import {NextFunction, Request, Response} from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import Attempt from "../entity/attempt";

export default class AuthController {
    private userRepository: Repository<User>;
    private attemptRepository: Repository<Attempt>;

    constructor() {
        this.userRepository = getRepository(User);
        this.attemptRepository = getRepository(Attempt);
    }

    /*
     * get login
     * @route GET /login
     */
    login(req: Request, res: Response) {
        res.render("pages/login");
    }

    /*
     * post login
     * @route POST /login
     */
    postLogin(req: Request, res: Response, next: NextFunction) {
        // api post validation
        if (!req.body.email || !req.body.password) {
            req.flash("error", "Some required fields are empty");
            return res.redirect("/login");
        }

        // authenticate user
        passport.authenticate("local", async function (err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                req.flash("error", "Email or password unknown");
                return res.redirect("/login");
            }
            const timestamp = Date.now();
            await getRepository(User)
                .createQueryBuilder()
                .update(User)
                .set({loginTime: timestamp})
                .where("id = :userId", {userId: user.id})
                .execute();
            user.loginTime = timestamp;
            req.logIn(user, function (err) {
                if (err) {
                    return next(err);
                }
                return res.redirect("/profile");
            });
        })(req, res, next);
    }

    /*
     * get register
     * @route GET /register
     */
    register(req: Request, res: Response) {
        res.render("pages/register");
    }

    /*
     * post register
     * @route POST /register
     */
    async postRegister(req: Request, res: Response, next: NextFunction) {
        // api post validation
        if (!req.body.name || !req.body.email || !req.body.email) {
            req.flash("error", "Some required fields are empty");
            return res.redirect("/register");
        }

        // create user object
        const user = new User();
        user.name = req.body.name;
        user.email = req.body.email;
        user.loginTime = Date.now();
        user.password = await AuthController.hashPassword(req.body.password);

        // save user
        this.userRepository
            .save(user)
            .then(() => {
                this.postLogin(req, res, next);
                req.flash("info", "Your account is successfully created!");
            })
            .catch(() => {
                req.flash("error", "Email address is already used");
                res.redirect("/register");
            });
    }

    /*
     * post logout
     * @route POST /logout
     */
    logout(req: Request, res: Response) {
        req.logout();
        res.redirect("/");
    }

    /*
     * get change_name
     *
     */
    change_name(req: Request, res: Response) {
        res.render("pages/change-name", {user: req.user});
    }

    /*
     * get change_email
     *
     */
    change_email(req: Request, res: Response) {
        res.render("pages/change-email");
    }

    /*
     *
     */
    async report(req: Request, res: Response) {
        const SessionPercentage = await this.getSessionPercentage(req, res);
        const TotalPercentage = await this.getTotalPercentage(req, res);
        const percObj = {session: SessionPercentage, total: TotalPercentage};
        res.render("pages/report", {
            percentage: percObj,
        });
    }

    /*
     * get request for total percentage of correct attempts
     */
    async getTotalPercentage(req: Request, res: Response) {
        const user = req.user as User;
        if (user) {
            const items = await this.attemptRepository
                .createQueryBuilder("attempt")
                .select(["attempt.grade"])
                .where("attempt.user.id = :userId", {userId: user.id})
                .getMany();

            let numTrue = 0;
            for (let i = 0; i < items.length; i++) {
                if (items[i].grade) {
                    numTrue++;
                }
            }
            if (items.length > 0) {
                const msg = (numTrue / items.length) * 100;
                return Math.round(msg) + "%";
            } else {
                return "No attempts";
            }
        } else {
            const errMsg = -2;
            return errMsg;
        }
    }

    /*
     * get request for session percentage of correct attempts
     */
    async getSessionPercentage(req: Request, res: Response) {
        const user = req.user as User;
        if (user) {
            const items = await this.attemptRepository
                .createQueryBuilder("attempt")
                .select(["attempt.grade"])
                .where(
                    "attempt.user.id = :userId",
                    {userId: user.id}
                )
                .andWhere("attempt.date_time_attempt > :lastLogin", {lastLogin: user.loginTime})
                .getMany();

            let numTrue = 0;
            for (let i = 0; i < items.length; i++) {
                if (items[i].grade) {
                    numTrue++;
                }
            }
            if (items.length > 0) {
                const msg = (numTrue / items.length) * 100;
                return Math.round(msg) + "%";
            } else {
                return "no attempts";
            }
        } else {
            const errMsg = -2;
            return errMsg;
        }
    }

    /*
     *
     */
    async changed_name(req: Request, res: Response, next: NextFunction) {
        const user = req.user as User;
        const newName = req.body.name;
        if (newName == req.body.second_check) {
            await this.userRepository
                .createQueryBuilder()
                .update(User)
                .set({name: newName})
                .where("id = :userId", {userId: user.id})
                .execute();
            user.name = newName;
            req.logIn(user, function (err) {
                if (err) {
                    return next(err);
                }
                return res.redirect("/profile");
            });
        } else {
            req.flash("error", "the 2 names do not correspond");
            res.redirect("/change_name");
        }
    }

    /*
     *
     */
    async changed_email(req: Request, res: Response, next: NextFunction) {
        const user = req.user as User;
        const newEmail = req.body.email;
        if (newEmail == req.body.second_check) {
            await this.userRepository
                .createQueryBuilder()
                .update(User)
                .set({email: newEmail})
                .where("id = :userId", {userId: user.id})
                .execute();
            user.email = newEmail;
            req.logIn(user, function (err) {
                if (err) {
                    return next(err);
                }
                return res.redirect("/profile");
            });
        } else {
            req.flash("error", "the 2 emails do not correspond");
            res.redirect("/change_email");
        }
    }

    /*
     * hash password
     * @return Promise<string>
     */
    static async hashPassword(password: string, saltRounds = 10) {
        return await bcrypt.hash(password, saltRounds);
    }
}
