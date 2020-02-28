#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include <time.h>
#include "kd_tree.h"

// #define NDEBUG
#include <assert.h>

#define rand1() (rand() / (FLOAT_UNIT)RAND_MAX)
#define rand_pt(v) { v.x[0] = rand1(); v.x[1] = rand1(); v.x[2] = -rand1(); }

void test_point_to_ray_dist_1() {
    point_t point = {{-1,1,0}},
              ray_orig = {{0,0,0}},
              ray_dir = {{1,1,0}};
    FLOAT_UNIT dist = sqrt(point_to_ray_dist(point, ray_orig, ray_dir));
    assert(fabs(dist-1.414) < 0.001);
}

void test_point_to_ray_dist_2() {
    point_t point = {{-1,0,11.1}},
              ray_orig = {{5.5,2.4,6.66}},
              ray_dir = {{1,0.2,-8}};
    FLOAT_UNIT dist = sqrt(point_to_ray_dist(point, ray_orig, ray_dir));
    assert(fabs(dist-6.320) < 0.001);
}

void test_get_first_intersection_1() {
    point_t *nodes = calloc(1, sizeof(point_t));
    nodes[0] = (point_t){{1,2,3}};
    kd_element_t *root = make_tree(nodes, 1, 0);
    point_t ray_orig = {{0,0,0}},
            ray_dir = {{1,2,2.9}},
            *first_intersection = NULL;
    get_first_intersection(root, ray_orig, ray_dir, &first_intersection);
        assert((*first_intersection).x[0] == 1 &&
           (*first_intersection).x[1] == 2 && 
           (*first_intersection).x[2] == 3);
    free(nodes);
}

void test_get_first_intersection_2() {
    point_t *nodes = calloc(1, sizeof(point_t));
    nodes[0] = (point_t){{1,2,4}};
    kd_element_t *root = make_tree(nodes, 1, 0);
    point_t *first_intersection = NULL,
            ray_orig = {{0,0,0}},
            ray_dir = {{1,2,2.9}};
    get_first_intersection(root, ray_orig, ray_dir, &first_intersection);
    assert(first_intersection == NULL);
    free(nodes);
}

void test_get_first_intersection_3() {
    point_t *nodes = calloc(9, sizeof(point_t));
    kd_element_t *root = NULL;
    point_t *first_intersection = NULL,
            ray_orig = {{-1,2,0}},
            ray_dir = {{1,-1,0.01}};
    nodes[0] = (point_t){{0,0,0}};
    nodes[1] = (point_t){{1,0,0}};
    nodes[2] = (point_t){{2,0,0}};
    nodes[3] = (point_t){{0,1,0}};
    nodes[4] = (point_t){{1,1,0}};
    nodes[5] = (point_t){{2,1,0}};
    nodes[6] = (point_t){{0,2,0}};
    nodes[7] = (point_t){{1,2,0}};
    nodes[8] = (point_t){{2,2,0}};
    root = make_tree(nodes, 9, 0);
    get_first_intersection(root, ray_orig, ray_dir, &first_intersection);
    assert((*first_intersection).x[0] == 0 &&
           (*first_intersection).x[1] == 1 && 
           (*first_intersection).x[2] == 0);

    ray_orig = (point_t){{0.25, 0.25, 0}};
    ray_dir = (point_t){{0.1, 0.1, 10}};
    first_intersection = NULL;
    get_first_intersection(root, ray_orig, ray_dir, &first_intersection);
    assert(first_intersection == NULL);
    free(nodes);
}

void test_get_first_intersection_4() {
    point_t *nodes = calloc(125, sizeof(point_t));
    kd_element_t *root = NULL;
    point_t *first_intersection = NULL,
            ray_orig,
            ray_dir;
    for (int i = 0; i < 5; ++i) {
        for (int j = 0; j < 5; ++j) {
            for (int k = 0; k < 5; ++k) {
                int idx = i * 25 + j * 5 + k;
                nodes[idx] = (point_t){{i, j, k}};
            }
        }
    }
    root = make_tree(nodes, 125, 0);
    ray_orig = (point_t){{-1, -1, -1}};
    ray_dir = (point_t){{1, 2, 3}};
    get_first_intersection(root, ray_orig, ray_dir, &first_intersection);
    assert((*first_intersection).x[0] == 0 &&
           (*first_intersection).x[1] == 1 && 
           (*first_intersection).x[2] == 2);

    ray_orig = (point_t){{-1, -1, -1}};
    ray_dir = (point_t){{1, 1.8, 3}};
    first_intersection = NULL;
    get_first_intersection(root, ray_orig, ray_dir, &first_intersection);
    assert(first_intersection == NULL);

    ray_orig = (point_t){{0, 3.2, 0}};
    ray_dir = (point_t){{4, 0.8, 4}};
    first_intersection = NULL;
    get_first_intersection(root, ray_orig, ray_dir, &first_intersection);
    assert((*first_intersection).x[0] == 4 &&
           (*first_intersection).x[1] == 4 && 
           (*first_intersection).x[2] == 4);
}

void test_get_first_intersection_speed() {
    point_t ray_orig = {{-20, -50, 3}}, 
            ray_dir,
            *first_intersection;
    const int N_RUNS = 1000;
    FLOAT_UNIT total_visited = 0;
    clock_t start = clock();
        for (int i = 0; i < N_RUNS; ++i) {
            rand_pt(ray_dir);
            first_intersection = NULL;
            get_first_intersection(ROOT, ray_orig, ray_dir, &first_intersection);
            total_visited += VISITED;
        }
    clock_t end = clock();
    float seconds = (float)(end - start) / CLOCKS_PER_SEC;
    printf("%d intersection calls take %f seconds.\n", N_RUNS, seconds);
    printf("each intersection call visits %lf nodes.\n", total_visited / N_RUNS);
}

int main(void)
{
    srand(0);
    initialize();
    printf("Completed initialize\n");
    test_point_to_ray_dist_1();
    printf("Completed test_point_to_ray_dist_1\n");
    test_point_to_ray_dist_2();
    printf("Completed test_point_to_ray_dist_2\n");
    test_get_first_intersection_1();
    printf("Completed test_point_to_ray_dist_1\n");
    test_get_first_intersection_2();
    printf("Completed test_point_to_ray_dist_2\n");
    test_get_first_intersection_3();
    printf("Completed test_point_to_ray_dist_3\n");
    test_get_first_intersection_4();
    printf("Completed test_point_to_ray_dist_4\n");
    test_get_first_intersection_speed();
    printf("Completed test_get_first_intersection_speed\n");
    printf("Completed all tests.\n");
}
 