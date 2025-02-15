CREATE OR REPLACE PACKAGE test_db_hello_world IS
    -- Declare test procedures here
    PROCEDURE test_hello_world;
END test_db_hello_world;
/

CREATE OR REPLACE PACKAGE BODY test_db_hello_world IS
    PROCEDURE test_hello_world IS
    BEGIN
        ut.expect(hello_world_function()).to_equal('Hello, World!');
    END test_hello_world;
END test_db_hello_world;
/

BEGIN
    ut.run('test_db_hello_world');
END;