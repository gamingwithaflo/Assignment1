/*

All API requests related to the Attempt entity route to here
functions:
getAttempts - gets all attempts from the logged in user
getLastAttempt - gets the last attempt per quiz (for the logged in user)
postAttempt - inserts a new attempt tuple in the db

*/

import {getRepository, Repository} from "typeorm";
import {Request, Response} from "express";
import Attempt from "../entity/attempt";
import Question from "../entity/question";
import User from "../entity/user";

/* Attempt API */
export default class AttemptController {
    private attemptRepository: Repository<Attempt>;
    private questionRepository: Repository<Question>;

    constructor() {
        this.attemptRepository = getRepository(Attempt);
        this.questionRepository = getRepository(Question);
    }

    /*
     * get attempts
     * @route GET /api/assessment/attempts
     */
    async getAttempts(req: Request, res: Response) {
        if (req.user) {
            const user = req.user as User;
            const userId = user.id;

            const items = await this.attemptRepository
                .createQueryBuilder("attempt")
                .where("attempt.user.id = :user_id", {user_id: userId})
                .getMany();

            res.json(items);
        } else {
            const errMsg = {msg: "User is not logged in"};
            res.json(errMsg);
        }
    }

    /*
     * get last attempt
     * @route GET /api/assessment/attempts/last
     */
    async getLastAttempt(req: Request, res: Response) {
        if (req.user) {
            const user = req.user as User;
            const userId = user.id;

            const item = await this.attemptRepository
                .createQueryBuilder("attempt")
                .leftJoinAndSelect("attempt.question", "question")
                .select(["attempt", "question"])
                .where("attempt.user.id = :user_id", {user_id: userId})
                .orderBy("date_time_attempt", "DESC")
                .limit(1)
                .getOne();

            res.json(item);
        } else {
            const errMsg = {msg: "User is not logged in"};
            res.json(errMsg);
        }
    }

    /*
       * post attempt
       * @route POST /api/assessment/attempts
       */
    async postAttempt(req: Request, res: Response) {
        if (req.user && req.body.questionId && req.body.postAnswer) {
            // TODO api: check if user logged in and set attempt
            const questionId = req.body.questionId;
            const postAnswer = req.body.postAnswer;

            const questionFromId = await this.questionRepository
                .createQueryBuilder("question")
                .select(["question", "question.correctAnswer"])
                .where("question.id = :question_id", {question_id: questionId})
                .getOne();

            const newGrade = (questionFromId.correctAnswer == postAnswer);

            const newAttempt = new Attempt();
            newAttempt.grade = newGrade;
            newAttempt.user = req.user as User;
            newAttempt.question = questionFromId;
            newAttempt.dateTimeAttempt = Date.now();
            newAttempt.userAnswer = postAnswer;

            await this.attemptRepository.save(newAttempt);

            res.json({msg: "Saved attempt", result: newGrade});
        } else if (!req.user) {
            const errMsg = {msg: "User is not logged in"};
            res.json(errMsg);
        } else {
            const errMsg = {msg: "Some required fields are empty"};
            res.json(errMsg);
        }
    }
}
