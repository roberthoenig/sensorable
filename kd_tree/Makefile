# The debug flags to enable the sanitizers
DEBUG_FLAGS = -fsanitize=undefined -g -fno-omit-frame-pointer -Wall -pedantic -Wshadow -Wconversion

debug: emcc
	gcc ${DEBUG_FLAGS} -c kd_tree.c
	gcc ${DEBUG_FLAGS} -c test_kd_tree.c
	gcc ${DEBUG_FLAGS} -o bin/test_kd_tree kd_tree.o test_kd_tree.o -lm

production: emcc
	gcc -O3 -c kd_tree.c
	gcc -O3 -c test_kd_tree.c
	gcc -O3 -o bin/test_kd_tree kd_tree.o test_kd_tree.o -lm

emcc:
	emcc kd_tree.c -o kd_tree.html -s EXPORTED_FUNCTIONS='["_initialize","_get_distance_to_first_intersection"]' -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' -s ALLOW_MEMORY_GROWTH=1 --preload-file model.pcd -O3

clean:
	rm -f kd_tree.o test_kd_tree.o test_kd_tree
