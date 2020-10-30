(function() {
    "use strict";

    const X = 10;
    const Y = 22;
    const GRID_X_OFFSET = 20;
    const GRID_Y_OFFSET = 21;
    const BLOCK_SIZE = 16;
    const DT = 1000;

    const WIDTH = 800;
    const HEIGHT = 400;

    // States
    const START = 0;
    const PLAYING = 1;
    const DEFEATED = 2;

    const COLORS = {
        I: "cyan",
        J: "lightblue",
        L: "orange",
        O: "yellow",
        S: "lightgreen",
        T: "violet",
        Z: "pink",
    };

    // Keycodes
    const LEFT = 37;
    const UP = 38;
    const RIGHT = 39;
    const DOWN = 40;

    // From the SRS spec
    const ORIENTATIONS = {
        I: [
            ["....",
             "####",
             "....",
             "...."],
            ["..#.",
             "..#.",
             "..#.",
             "..#."],
            ["....",
             "....",
             "####",
             "...."],
            [".#..",
             ".#..",
             ".#..",
             ".#.."],
        ],
        J: [
            ["#..",
             "###",
             "..."],
            [".##",
             ".#.",
             ".#."],
            ["...",
             "###",
             "..#."],
            [".#.",
             ".#.",
             "##."],
        ],
        L: [
            ["..#",
             "###",
             "..."],
            [".#.",
             ".#.",
             ".##"],
            ["...",
             "###",
             "#.."],
            ["##.",
             ".#.",
             ".#."],
        ],
        O: [
            [".##.",
             ".##.",
             "...."],
        ],
        S: [
            [".##",
             "##.",
             "..."],
            [".#.",
             ".##",
             "..#"],
            ["...",
             ".##",
             "##."],
            ["#..",
             "##.",
             ".#."],
        ],
        T: [
            [".#.",
             "###",
             "..."],
            [".#.",
             ".##",
             ".#."],
            ["...",
             "###",
             ".#."],
            [".#.",
             "##.",
             ".#."],
        ],
        Z: [
            ["##.",
             ".##",
             "..."],
            ["..#",
             ".##",
             ".#."],
            ["...",
             "##.",
             ".##"],
            [".#.",
             "##.",
             "#.."],
        ],
    };

    class Tetris {
        constructor() {
            this.state = PLAYING;
            this.bag = [];
        }

        main() {
            this.init();

            this.loop();
            this.render();
        }

        init() {
            // Preallocate
            this.grid = new Array(X);
            for (let i = 0; i < this.grid.length; ++i) {
                this.grid[i] = new Array(Y);
            }

            // Initialize
            for (let i = 0; i < X; ++i) {
                for (let j = 0; j < Y; ++j) {
                    this.grid[i][j] = new Cell(i, j);
                }
            }
        }

        loop() {
            this.loopID = setInterval(function() {
                window.Tetris.tick();
            }, DT);
        }

        tick() {
            switch(this.state) {
            case PLAYING:
                this.playingTick();
                return;
            default:
                return;
            }
        }

        playingTick() {
            if (this.isDefeated()) {
                this.state = DEFEATED;
                return;
            }
            if (!this.tetrimino) {
                this.removeFinishedRows();
                const next = this.chooseTetrimino();
                this.makeTetrimino(next);
            } else {
                this.dropTetrimino();
            }
        }

        isDefeated() {
            if (this.tetrimino) {
                return false;
            }

            for (let i = 0; i < X; ++i) {
                if (this.grid[i][1].occupied) {
                    return true;
                }
            }
            return false;
        }

        render() {
            window.requestAnimationFrame(function() {
                window.Tetris.render();
            });

            this.canvas.width = window.innerWidth - 20;
            this.canvas.height = window.innerHeight - 20;

            // Grid
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            for (let i = 0; i < X; ++i) {
                for (let j = 1; j < Y; ++j) {
                    this.grid[i][j].render(this.context);
                }
            }

            // Game Over
            if (this.state == DEFEATED) {
                this.context.font = px(20) + "px Georgia";
                this.context.fillStyle = "black";
                this.context.fillText("Game Over", 400, 200);
            }
        }

        chooseTetrimino() {
            if (this.bag.length === 0) {
                this.bag = shuffle(["I", "J", "L", "S", "T", "Z", "O"]);
            }
            return this.bag.pop();
        }

        makeTetrimino(shape) {
            this.tetrimino = {
                origin: {x: 3, y: 0},
                shape: shape,
                orientation: 0,
            };
        }

        move(newOrigin, o) {
            let orientation = ORIENTATIONS[this.tetrimino.shape][this.tetrimino.orientation];
            const newOrientation = ORIENTATIONS[this.tetrimino.shape][o];
            const color = COLORS[this.tetrimino.shape];

            // Subtract
            for (let i = 0; i < orientation.length; ++i) {
                for (let j = 0; j < orientation[i].length; ++j) {
                    if (orientation[i][j] !== '#') {
                        continue;
                    }

                    const x = this.tetrimino.origin.x + j;
                    const y = this.tetrimino.origin.y + i;

                    this.grid[x][y].occupied = false;
                }
            }

            // Check
            const collision = this.isColliding(newOrigin, newOrientation);

            // Drop
            if (!collision) {
                this.tetrimino.origin.x = newOrigin.x;
                this.tetrimino.origin.y = newOrigin.y;
                orientation = newOrientation;
            }

            // Add
            for (let i = 0; i < orientation.length; ++i) {
                for (let j = 0; j < orientation[i].length; ++j) {
                    if (orientation[i][j] !== '#') {
                        continue;
                    }

                    const x = this.tetrimino.origin.x + j;
                    const y = this.tetrimino.origin.y + i;

                    this.grid[x][y].occupied = true;
                    this.grid[x][y].color = color;
                }
            }

            return !collision;
        }

        removeFinishedRows() {
            for (let y = 0; y < Y; ++y) {

                // Check for full row
                let clearRow = true;
                for (let x = 0; x < X; ++x) {
                    if (!this.grid[x][y].occupied) {
                        clearRow = false;
                    }
                }
                if (!clearRow) {
                    continue;
                }

                // Clear Row
                for (let x = 0; x < X; ++x) {
                    this.grid[x][y].occupied = false;
                }

                // Drop
                for (y = y - 1; y >=0; --y) {
                    for (let x = 0; x < X; ++x) {
                        if (!this.grid[x][y].occupied) {
                            continue;
                        }
                        this.grid[x][y].occupied = false;
                        this.grid[x][y+1].occupied = true;
                        this.grid[x][y+1].color = this.grid[x][y].color;
                    }
                }
            }
        }

        moveLeft() {
            const newOrigin = {x: this.tetrimino.origin.x - 1, y: this.tetrimino.origin.y}

            return this.move(newOrigin, this.tetrimino.orientation);
        }

        moveRight() {
            const newOrigin = {x: this.tetrimino.origin.x + 1, y: this.tetrimino.origin.y};

            return this.move(newOrigin, this.tetrimino.orientation);
        }

        rotate() {
            clearInterval(this.loopID);

            const o = (this.tetrimino.orientation + 1) % ORIENTATIONS[this.tetrimino.shape].length;

            // No wall kick
            let success = this.tryRotation(this.tetrimino.origin, o);

            // Left wall kick
            if (!success) {
                newOrigin = {x: this.tetrimino.origin.x - 1, y: this.tetrimino.origin.y};
                success = this.tryRotation(newOrigin, o);
            }

            // Right wall kick
            if (!success) {
                newOrigin = {x: this.tetrimino.origin.x + 1, y: this.tetrimino.origin.y};
                success = this.tryRotation(newOrigin, o);
            }

            this.loop();
        }

        tryRotation(newOrigin, o) {
            const success = this.move(newOrigin, o);
            if (success) {
                this.tetrimino.orientation = o;
            }
            return success;
        }

        dropTetrimino() {
            const newOrigin = {x: this.tetrimino.origin.x, y: this.tetrimino.origin.y + 1};
            const orientation = this.tetrimino.orientation;

            const success = this.move(newOrigin, orientation);

            // Lock
            if (!success) {
                this.tetrimino = undefined;
            }
        }

        isColliding(origin, orientation) {
            for (let i = 0; i < orientation.length; ++i) {
                for (let j = 0; j < orientation[i].length; ++j) {
                    if (orientation[i][j] !== '#') {
                        continue;
                    }

                    const x = origin.x + j;
                    const y = origin.y + i;

                    if (!(0 <= x && x < X) ||
                            !(0 <= y && y < Y) || this.grid[x][y].occupied) {
                        return true;
                    }
                }
            }

            return false;
        }
    };

    class Cell {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.occupied = false;
        }

        render(ctx) {
            var ratio = getScreenRatio();

            if (this.occupied) {
                this.fill(ctx);
            } else {
                this.clear(ctx);
            }
            ctx.strokeStyle = "#000";
            ctx.lineWidth = px(1);
            ctx.strokeRect(
                px(GRID_X_OFFSET + this.x * BLOCK_SIZE),
                px(GRID_Y_OFFSET + this.y * BLOCK_SIZE),
                px(BLOCK_SIZE), px(BLOCK_SIZE));
        }

        clear(ctx) {
            ctx.clearRect(
                px(GRID_X_OFFSET + this.x * BLOCK_SIZE),
                px(GRID_Y_OFFSET + this.y * BLOCK_SIZE),
                px(BLOCK_SIZE), px(BLOCK_SIZE));
        }

        fill(ctx) {
            ctx.fillStyle = this.color;
            ctx.fillRect(
                px(GRID_X_OFFSET + this.x * BLOCK_SIZE),
                px(GRID_Y_OFFSET + this.y * BLOCK_SIZE),
                px(BLOCK_SIZE), px(BLOCK_SIZE));
        }
    }

    function shuffle(a) {
        for (let i = a.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random() * (i+1));

            const temp = a[i];
            a[i] = a[j];
            a[j] = temp;
        }

        return a;
    }

    function handleKeypress(e) {
        if (!window.Tetris.tetrimino) {
            return;
        }

        switch (e.which) {
            case LEFT:
                window.Tetris.moveLeft();
                break;
            case RIGHT:
                window.Tetris.moveRight();
                break;
            case UP:
                window.Tetris.rotate();
                break;
            case DOWN:
                window.Tetris.dropTetrimino();
                break;
        }
    }

    function px(dp) {
        return dp * getScreenRatio();
    }

    function getScreenRatio() {
        return Math.min(window.Tetris.canvas.width / WIDTH, window.Tetris.canvas.height / HEIGHT);
    }

    window.onload = function() {
        window.Tetris = new Tetris();
        window.Tetris.canvas = document.getElementById("canvas");
        window.Tetris.context = window.Tetris.canvas.getContext("2d");

        window.addEventListener('keydown', handleKeypress);

        window.Tetris.main();
    }
})();
