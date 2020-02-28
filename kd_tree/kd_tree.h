#ifndef KD_TREE_H 
#define KD_TREE_H 1

#include <stdbool.h>

#define MAX_DIM 3
#define BIG_NUMBER 100000000
#define POINT_RADIUS 0.15
#define DISTANCE_LOWER_THRESHOLD 0.30
#define N_LEAF_POINTS 8
typedef double FLOAT_UNIT;

typedef struct point {
    FLOAT_UNIT x[MAX_DIM];
} point_t;

typedef struct kd_leaf {
    point_t x[N_LEAF_POINTS];
} kd_leaf_t;

typedef struct kd_element {
    bool is_leaf;
    union {
        kd_leaf_t *leaf;
        struct {
            FLOAT_UNIT split;
            struct kd_element *left, *right;
        };
    };

} kd_element_t;


typedef struct {
    kd_element_t *node;
    FLOAT_UNIT t_min;
    FLOAT_UNIT t_max;
    int i; // split axis
} stack_item_t;

kd_element_t *ROOT;
point_t *NODES;
int VISITED;
stack_item_t *STACK;

void print_point(point_t node);
void print_tree(kd_element_t* node, int indentation);

kd_element_t* make_tree(point_t *t, int len, int i);

FLOAT_UNIT point_to_ray_dist(point_t point, point_t ray_orig, point_t ray_dir);

point_t normalize_vector(point_t v);

void get_first_intersection(
    kd_element_t *root,
    const point_t ray_orig,
    const point_t ray_dir,
    point_t **first_intersection
);

FLOAT_UNIT get_distance_to_first_intersection(
    FLOAT_UNIT ray_orig_x,
    FLOAT_UNIT ray_orig_y,
    FLOAT_UNIT ray_orig_z,
    FLOAT_UNIT ray_dir_x,
    FLOAT_UNIT ray_dir_y,
    FLOAT_UNIT ray_dir_z);

void initialize();

#endif
