#include <string.h>
#include <stdio.h>
#include <stdlib.h> 
#include <math.h>
#include "kd_tree.h"
#include <assert.h>

void print_point(point_t point) {
    printf("(%0.4lf, %0.4lf, %0.4lf)\n", point.x[0], point.x[1], point.x[2]);
}

void print_spaces(int n) { for (int i = 0; i < n; ++i) printf(" "); }

void print_tree(kd_element_t *root, int indentation) {
    if (root->is_leaf) {
        for (int i = 0; i < N_LEAF_POINTS; ++i) {
            point_t pt = root->leaf->x[i];
            if (pt.x[0]==BIG_NUMBER && pt.x[1]==BIG_NUMBER && pt.x[2]==BIG_NUMBER) {break;}
            print_spaces(indentation);
            print_point(root->leaf->x[i]);
        }
    } else {
        print_spaces(indentation);
        printf("split dim %d at %lf\n", (indentation/2) % MAX_DIM, root->split);
        if (root->left) {
            print_spaces(indentation);
            printf("Left Subtree:\n");
            print_tree(root->left, indentation+2);
        }
        if (root->right) {
            print_spaces(indentation);
            printf("Right Subtree:\n");
            print_tree(root->right, indentation+2);
        }
    }
}

FLOAT_UNIT dist(point_t *a, point_t *b, int dim) {
    FLOAT_UNIT t, d = 0;
    while (dim--) {
        t = a->x[dim] - b->x[dim];
        d += t * t;
    }
    return d;
}

int kd_node_compare_0(const void *a, const void *b) {
    return (*(point_t*)a).x[0] < (*(point_t*)b).x[0] ? -1 : 1;
}
int kd_node_compare_1(const void *a, const void *b) {
    return (*(point_t*)a).x[1] < (*(point_t*)b).x[1] ? -1 : 1;
}
int kd_node_compare_2(const void *a, const void *b) {
    return (*(point_t*)a).x[2] < (*(point_t*)b).x[2] ? -1 : 1;
}

void sort_axis(point_t *start, point_t *end, int axis) {
    switch (axis) {
        case 0: qsort(start, (end-start), sizeof(point_t), kd_node_compare_0); break;
        case 1: qsort(start, (end-start), sizeof(point_t), kd_node_compare_1); break;
        case 2: qsort(start, (end-start), sizeof(point_t), kd_node_compare_2); break;
    }
}

kd_element_t* make_tree(point_t *t, int len, int i) {
    kd_element_t *root = calloc(1, sizeof(kd_element_t));
    if (len <= N_LEAF_POINTS) {
        root->is_leaf = true;
        root->leaf = calloc(1, sizeof(kd_leaf_t));
        for (int i = 0; i < len; ++i) {
            root->leaf->x[i] = t[i];
        }
        if (len < N_LEAF_POINTS) {
            root->leaf->x[len] = (point_t){{BIG_NUMBER, BIG_NUMBER, BIG_NUMBER}};
        }
    } else {
        sort_axis(t, t+len, i);
        point_t *best_split = t;
        FLOAT_UNIT min_cost = BIG_NUMBER;
        const FLOAT_UNIT dim_width = t[len-1].x[i] - t[0].x[i];
        for (int idx = 0; idx < len; ++idx) {
            // Very rough estimation of space covered by points in left & right subspace.
            const FLOAT_UNIT prob_hit_left = (t[idx].x[i] - t[0].x[i]) / dim_width;
            const FLOAT_UNIT prob_hit_right = 1 - prob_hit_left;
            // Very rough estimation of cost of traversing left & right subspace.
            const FLOAT_UNIT cost_left = idx+1;
            const FLOAT_UNIT cost_right = len - (idx+1);
            const FLOAT_UNIT cost = prob_hit_left * cost_left + prob_hit_right * cost_right;
            if (cost < min_cost) {
                best_split = t + idx;
                min_cost = cost;
            }
        }
        root->is_leaf = false;
        if (best_split == t) {
            ++best_split;
        }
        root->split = (best_split->x[i] + (best_split-1)->x[i]) / 2;
        i = (i + 1) % MAX_DIM;
        root->left  = make_tree(t, best_split - t, i);
        root->right = make_tree(best_split, (t + len) - best_split, i);
    }
    return root;
}

FLOAT_UNIT point_to_ray_dist(point_t point, point_t ray_orig, point_t ray_dir) {
    ray_dir = normalize_vector(ray_dir);
    point_t p_dir = {{
        point.x[0] - ray_orig.x[0],
        point.x[1] - ray_orig.x[1],
        point.x[2] - ray_orig.x[2],
    }};
    FLOAT_UNIT t = p_dir.x[0] * ray_dir.x[0] + p_dir.x[1] * ray_dir.x[1] + p_dir.x[2] * ray_dir.x[2];
    FLOAT_UNIT x_dist = (p_dir.x[0] - t*ray_dir.x[0]);
    FLOAT_UNIT y_dist = (p_dir.x[1] - t*ray_dir.x[1]);
    FLOAT_UNIT z_dist = (p_dir.x[2] - t*ray_dir.x[2]);
    return x_dist*x_dist + y_dist*y_dist + z_dist*z_dist;
}

point_t normalize_vector(point_t v) {
    FLOAT_UNIT length = sqrt(v.x[0]*v.x[0] + v.x[1]*v.x[1] + v.x[2]*v.x[2]);
    return (point_t){{
        v.x[0]/length,
        v.x[1]/length,
        v.x[2]/length
    }};
}

// Assume that ray_dir is normalized.
void get_first_intersection(
    kd_element_t *root,
    point_t ray_orig,
    point_t ray_dir,
    point_t **first_intersection
) {
    *first_intersection = NULL;
    ray_dir = normalize_vector(ray_dir);
    int stack_len = 1;
    STACK[0] = (stack_item_t){root, 0, BIG_NUMBER, 0};
    VISITED = 0;
    while (stack_len != 0) {
        VISITED++;
        stack_item_t item = STACK[--stack_len];
        assert (item.node != NULL);
        if (item.node->is_leaf) {
            FLOAT_UNIT minimum_distance_found = 1000000;
            for (int i = 0; i < N_LEAF_POINTS; ++i) {
                point_t point = item.node->leaf->x[i];
                if (point.x[0] == BIG_NUMBER && point.x[1] == BIG_NUMBER && point.x[2] == BIG_NUMBER) { break; }
                if (point_to_ray_dist(point, ray_orig, ray_dir) <= POINT_RADIUS*POINT_RADIUS) {
                    FLOAT_UNIT distance = dist(&point, &ray_orig, 3);
                    if (distance <= minimum_distance_found && distance > DISTANCE_LOWER_THRESHOLD) {
                        minimum_distance_found = distance;
                        *first_intersection = item.node->leaf->x+i;
                    }
                }
            }
            if (*first_intersection != NULL) { return; }
        } else {
        FLOAT_UNIT t_min = item.t_min;
        FLOAT_UNIT t_max = item.t_max;
        int i = item.i;
        int child_i = (i+1) % MAX_DIM;
        FLOAT_UNIT t_split = ( item.node->split - ray_orig.x[i] ) / ray_dir.x[i]; // Careful! Division! Make sure ray_dir non-zero.
        FLOAT_UNIT t_point_radius_offset = fabs(POINT_RADIUS / ray_dir.x[i]); // Treat points as spheres.
        kd_element_t *near_child = ray_dir.x[i] > 0 ? item.node->left : item.node->right;
        kd_element_t *far_child = ray_dir.x[i] > 0 ? item.node->right : item.node->left;
        if (t_split >= t_max + t_point_radius_offset /*|| t_split < 0*/) {
            STACK[stack_len++] = (stack_item_t){near_child, t_min, t_max, child_i};
        } else if (t_split <= t_min - t_point_radius_offset) {
            STACK[stack_len++] = (stack_item_t){far_child, t_min, t_max, child_i};
        } else {
            STACK[stack_len++] = (stack_item_t){far_child, fmax(t_min, t_split), t_max, child_i};
            STACK[stack_len++] = (stack_item_t){near_child, t_min, fmin(t_max, t_split), child_i};
        }
        }
    }
}

void initialize() {
    FILE *file = fopen("model.pcd", "r");
    if (!file) {
        printf("cannot open file\n");
    }
    char *line = NULL;
    size_t len = 0;
    ssize_t read;
    int i = 0;
    int x_pos = -1,
        y_pos = -1,
        z_pos = -1;
    int n_points = 0;
    for (i = 0; (read = getline(&line, &len, file)) != -1; ++i) {
        if (i == 2) {
            char *token = strtok(line, " ");
            for(int idx = 0; token; ++idx) {
                switch (*token) {
                    case 'x': x_pos = idx-1; break;
                    case 'y': y_pos = idx-1; break;
                    case 'z': z_pos = idx-1; break;
                }
                token = strtok(NULL, " ");
            }
        }
        if (i == 9) {
            sscanf(line, "POINTS %d", &n_points);
            NODES = calloc(n_points, sizeof(point_t));
            STACK = calloc(n_points, sizeof(stack_item_t));
        }
        if (i >= 11) { // Ignore header.
            char *token = strtok(line, " ");
            for(int idx = 0; token; ++idx) {
                if (idx == x_pos) { sscanf(token, "%lf", NODES[i-11].x); }
                if (idx == y_pos) { sscanf(token, "%lf", NODES[i-11].x+1); }
                if (idx == z_pos) { sscanf(token, "%lf", NODES[i-11].x+2); }
                token = strtok(NULL, " ");
            }
        }
    }
    fclose (file);
    printf("Lines read: %d\n", i);
    ROOT = make_tree(NODES, n_points, 0);
}

FLOAT_UNIT get_distance_to_first_intersection(
    FLOAT_UNIT ray_orig_x,
    FLOAT_UNIT ray_orig_y,
    FLOAT_UNIT ray_orig_z,
    FLOAT_UNIT ray_dir_x,
    FLOAT_UNIT ray_dir_y,
    FLOAT_UNIT ray_dir_z)
{
    point_t *first_intersection = NULL;
    point_t ray_orig = {{ray_orig_x, ray_orig_y, ray_orig_z}},
              ray_dir = {{ray_dir_x, ray_dir_y, ray_dir_z}};

    get_first_intersection(ROOT, ray_orig, ray_dir, &first_intersection);

    if (first_intersection == NULL) {
        return BIG_NUMBER;
    } else {
        return sqrt(dist(first_intersection, &ray_orig, MAX_DIM));
    }
}
