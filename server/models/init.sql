create table users(
    id serial primary key,
    user_name varchar(255) not null,
    password varchar(255) not null,
    email varchar(255) not null,
    created_at timestamp default current_timestamp
);

create table user_token(
    user_token_id SERIAL NOT NULL primary KEY,
    fk_user int,
    token varchar,
    created_at timestamp,
    updated_at timestamp,
    constraint fk_user FOREIGN KEY(fk_user) references users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Test (
    test_id SERIAL PRIMARY KEY,
    userId INT ,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Question (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correctOption INT NOT NULL,
    topic TEXT NOT NULL,
    subTopic TEXT NOT NULL,
    difficulty INT NOT NULL
);

CREATE TABLE TestQuestion (
    id SERIAL PRIMARY KEY,
    testId INT NOT NULL,
    questionId INT NOT NULL,
    selectedOption INT,
    reviewStatus BOOLEAN,
    submitStatus BOOLEAN,
    FOREIGN KEY (testId) REFERENCES Test(test_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (questionId) REFERENCES Question(id) ON DELETE CASCADE ON UPDATE CASCADE
);